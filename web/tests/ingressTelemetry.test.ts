import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IngressTelemetry, noPoints, parseTelemetryPoints } from '../src/api/ingressTelemetry';
import { atlasNetConfig } from '../scripts/atlasnet-config.mjs';
import { telemetryQuery } from '../scripts/telemetry.mjs';

test('Control API is mandatory and HTTPS discovery uses the same authority', () => {
  for (const value of [undefined, '', 'http://localhost', 'ws:///missing-host', 'ws://x/#bad']) {
    assert.throws(() => atlasNetConfig({ ATLASNET_CONTROL_PANEL_URL: value }), /ATLASNET_CONTROL_PANEL_URL/);
  }
  assert.equal(atlasNetConfig({ ATLASNET_CONTROL_PANEL_URL: 'wss://[::1]:8043/socket' }).discovery,
    'https://[::1]:8043/api/v1/metrics/discovery');
});

test('queries accept only supported metrics, ranges and exact label selectors', () => {
  assert.throws(() => telemetryQuery(new URLSearchParams('metric=up')));
  assert.throws(() => telemetryQuery(new URLSearchParams('metric=commands.rate&range=123')));
  assert.throws(() => telemetryQuery(new URLSearchParams('metric=ingress.sessions')));
  const query = telemetryQuery(new URLSearchParams({ metric: 'commands.rate', node: 'one"', range: '300' }));
  assert.equal(query.range, 300);
  assert.equal(query.expression('active'),
    'sum(rate(atlasnet_ingress_commands_received_total{job="atlasnet",atlasnet_cluster="active",atlasnet_node="one\\\""}[1m]))');
});

test('samples are normalized without inventing missing values', () => {
  assert.deepEqual(parseTelemetryPoints([[1000, 2], ['1001', '3'], [5000, Infinity], [6000, 0]]),
    [{ x: 1000, y: 2 }, { x: 6000, y: 0 }]);
  assert.equal(parseTelemetryPoints(null), noPoints);
});

test('widgets share matching HTTP requests and report upstream failure', async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const path = String(input);
    requests.push(path);
    return path.includes('range=300')
      ? Response.json([[1000, 5]])
      : Response.json({ error: 'Prometheus is unavailable.' }, { status: 503 });
  };
  const service = new IngressTelemetry();
  const query = { metric: 'commands.rate', range: 300, scope: { node: 'one', endpoint: 'lobby' } };
  const subscriptions: (() => void)[] = [];
  try {
    await Promise.all([
      new Promise<void>((ok) => subscriptions.push(service.subscribe('shared', query, ok))),
      new Promise<void>((ok) => subscriptions.push(service.subscribe('shared', query, ok))),
    ]);
    assert.equal(requests.length, 1);
    assert.match(requests[0], /^\/api\/telemetry\?metric=commands.rate&range=300&node=one&endpoint=lobby$/);
    assert.deepEqual(service.snapshot('shared'), [{ x: 1000, y: 5 }]);
    await new Promise<void>((ok) => subscriptions.push(service.subscribe('instant', { ...query, range: 0 }, ok)));
    assert.equal(service.getError(), 'Prometheus is unavailable.');
    assert.equal(service.snapshot('instant'), noPoints);
  } finally {
    for (const unsubscribe of subscriptions) unsubscribe();
    globalThis.fetch = originalFetch;
  }
});
