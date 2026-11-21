const metrics = new Map([
  ['commands.rate', ['atlasnet_ingress_commands_received_total', 'rate']],
  ['signals.rate', ['atlasnet_ingress_signals_sent_total', 'rate']],
  ['commands.total', ['atlasnet_ingress_commands_received_total', 'total']],
  ['signals.total', ['atlasnet_ingress_signals_sent_total', 'total']],
  ['ingress.receive-rate', ['atlasnet_ingress_bytes_received_total', 'bandwidth']],
  ['ingress.send-rate', ['atlasnet_ingress_bytes_sent_total', 'bandwidth']],
  ['ingress.sessions', ['atlasnet_ingress_connected_clients', 'total']],
]);
const scopes = new Map([['node', 'atlasnet_node'], ['listener', 'listener'], ['endpoint', 'endpoint']]);

export function telemetryQuery(parameters) {
  const metric = parameters.get('metric');
  const descriptor = metrics.get(metric);
  const range = parameters.get('range') ?? '0';
  if (!descriptor || !['0', '300', '900', '3600', '86400'].includes(range)) {
    throw new Error('Unsupported metric or time range.');
  }
  const selectors = [];
  for (const [key, value] of parameters) {
    if (key === 'metric' || key === 'range') continue;
    if (!scopes.has(key) || !value || value.length > 128 || /[\x00-\x1f\x7f]/.test(value) ||
        parameters.getAll(key).length !== 1) throw new Error('Invalid telemetry scope.');
    selectors.push(`${scopes.get(key)}=${JSON.stringify(value)}`);
  }
  if (metric === 'ingress.sessions' && !parameters.has('listener') && !parameters.has('endpoint')) {
    throw new Error('Session counts require a listener or endpoint filter.');
  }

  const [name, kind] = descriptor;
  return {
    range: Number(range),
    expression(cluster) {
      const filter = ['job="atlasnet"', `atlasnet_cluster=${JSON.stringify(cluster)}`, ...selectors].join(',');
      const series = `${name}{${filter}}`;
      return `sum(${kind === 'total' ? series : `rate(${series}[1m])`})${kind === 'bandwidth' ? ' / 1024' : ''}`;
    },
  };
}

async function fetchJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function telemetryMiddleware(discoveryURL, env = process.env) {
  const upstream = new URL(env.CARTOGRAPH_PROMETHEUS_URL || `http://127.0.0.1:${env.PROMETHEUS_PORT || '9090'}`);
  if (!['http:', 'https:'].includes(upstream.protocol) || upstream.username || upstream.password || upstream.search || upstream.hash) {
    throw new Error('CARTOGRAPH_PROMETHEUS_URL must be an HTTP(S) base URL.');
  }
  let discovery;
  let expires = 0;
  let active = 0;
  function discover() {
    if (!discovery || Date.now() >= expires) {
      expires = Date.now() + 5000;
      discovery = fetchJSON(discoveryURL).then((groups) => {
        if (!Array.isArray(groups)) throw new Error();
        if (!groups.length) return null;
        const cluster = groups[0]?.labels?.atlasnet_cluster;
        if (typeof cluster !== 'string' || !cluster || groups.some(({ labels }) => labels?.atlasnet_cluster !== cluster)) {
          throw new Error();
        }
        return cluster;
      }).catch(() => { throw new Error('Cannot read metrics discovery from the configured AtlasNet Control API.'); });
    }
    return discovery;
  }

  return async (request, response, next) => {
    if (request.url?.split('?')[0] !== '/api/telemetry') return next();
    const url = new URL(request.url, 'http://localhost');
    function send(status, value) {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(value));
    }
    if (request.method !== 'GET') return send(405, { error: 'Expected GET.' });
    if (request.headers['sec-fetch-site'] === 'cross-site') return send(403, { error: 'Cross-site query denied.' });
    let query;
    try { query = telemetryQuery(url.searchParams); }
    catch (error) { return send(400, { error: error.message }); }
    if (active >= 16) return send(429, { error: 'Telemetry is busy.' });
    active++;
    try {
      const cluster = await discover();
      if (!cluster) return send(200, []);
      const path = query.range ? 'query_range' : 'query';
      const target = new URL(`${upstream.href.replace(/\/$/, '')}/api/v1/${path}`);
      target.searchParams.set('query', query.expression(cluster));
      if (query.range) {
        const step = Math.max(15, Math.floor(query.range / 480));
        const end = Math.floor(Date.now() / 1000 / step) * step;
        target.searchParams.set('start', String(end - query.range));
        target.searchParams.set('end', String(end));
        target.searchParams.set('step', String(step));
      }
      const body = await fetchJSON(target).catch(() => { throw new Error('Prometheus is unavailable.'); });
      if (body.status !== 'success' || body.data?.resultType !== (query.range ? 'matrix' : 'vector')) {
        throw new Error('Prometheus returned an unexpected response.');
      }
      const series = body.data.result[0];
      const samples = series ? (query.range ? series.values : [series.value]) : [];
      const points = samples.flatMap(([time, value]) =>
        Number.isFinite(time) && typeof value === 'string' && value.trim() && Number.isFinite(Number(value)) ? [[time * 1000, Number(value)]] : []);
      send(200, points);
    } catch (error) {
      send(503, { error: error.message });
    } finally {
      active--;
    }
  };
}
