export function atlasNetConfig(env = process.env) {
  const raw = env.ATLASNET_CONTROL_PANEL_URL?.trim();
  try {
    if (!raw || !/^wss?:\/\/[^/]/i.test(raw) || /[\s\\#]/.test(raw)) throw Error();
    const endpoint = new URL(raw);
    if (!endpoint.hostname || endpoint.username || endpoint.password) throw Error();
    const discovery = new URL('/api/v1/metrics/discovery', endpoint);
    discovery.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
    return { endpoint: endpoint.href, discovery: discovery.href };
  } catch {
    throw new Error('ATLASNET_CONTROL_PANEL_URL must be set to a valid ws:// or wss:// Control API URL.');
  }
}
