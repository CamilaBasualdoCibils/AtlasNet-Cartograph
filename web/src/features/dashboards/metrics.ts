export const metrics = [
  { id: 'clients.connected', label: 'Connected Clients', kind: 'stat' },
  { id: 'nodes.healthy', label: 'Healthy Nodes', kind: 'stat' },
  { id: 'shards.running', label: 'Running Shards', kind: 'stat' },
  { id: 'commands.rate', label: 'Incoming Commands/s', kind: 'timeseries', unit: 'operations/s', ingress: true },
  { id: 'signals.rate', label: 'Outgoing Signals/s', kind: 'timeseries', unit: 'operations/s', ingress: true },
  { id: 'commands.total', label: 'Cumulative incoming commands', kind: 'timeseries', unit: 'operations', ingress: true },
  { id: 'signals.total', label: 'Cumulative outgoing signal deliveries', kind: 'timeseries', unit: 'operations', ingress: true },
  { id: 'ingress.receive-rate', label: 'Incoming KiB/s', kind: 'timeseries', unit: 'KiB/s', ingress: true },
  { id: 'ingress.send-rate', label: 'Outgoing KiB/s', kind: 'timeseries', unit: 'KiB/s', ingress: true },
  { id: 'ingress.sessions', label: 'Connected clients (ingress sessions)', kind: 'timeseries', unit: 'sessions', ingress: true },
  { id: 'transfers.rate', label: 'Entity transfers/s', kind: 'timeseries', unit: 'operations/s', ingress: false },
  { id: 'transfers.latency', label: 'Cross-node latency (p95)', kind: 'stat' },
  { id: 'transfers.failed', label: 'Failed transfers', kind: 'stat' },
  { id: 'nodes.healthy-percent', label: 'Healthy Nodes (%)', kind: 'percent' },
  { id: 'shards.running-percent', label: 'Running Shards (%)', kind: 'percent' },
  { id: 'nodes.status', label: 'Node status', kind: 'entities' },
  { id: 'shards.status', label: 'Shard status', kind: 'entities' },
] as const;

export const ranges = [
  { id: '5m', label: '5 minutes', minutes: 5 },
  { id: '15m', label: '15 minutes', minutes: 15 },
  { id: '1h', label: '1 hour', minutes: 60 },
  { id: '24h', label: '24 hours', minutes: 1440 },
] as const;

export function metricLabel(id: string) {
  return metrics.find((metric) => metric.id === id)?.label ?? id;
}

type SeriesMetric = Extract<(typeof metrics)[number], { kind: 'timeseries' }>;
const seriesMetrics = metrics.filter((metric): metric is SeriesMetric => metric.kind === 'timeseries');

export function seriesMetric(id: string) {
  return seriesMetrics.find((metric) => metric.id === id);
}

export const scopeFields = [
  { name: 'node', label: 'Node ID' },
  { name: 'listener', label: 'Listener' },
  { name: 'endpoint', label: 'Endpoint' },
] as const;
