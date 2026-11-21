import { useContext, type ComponentType } from 'react';
import { metricLabel, seriesMetric } from '../metrics';
import { useIngressMetric } from '../ingressTelemetry';
import { TelemetryContext, type MetricValue } from '../telemetry';
import type { WidgetConfig } from '../types';
import { TimeSeriesWidget } from './TimeSeriesWidget';

type RendererProps = { config: WidgetConfig };

function displayValue(metric: MetricValue) {
  const value = metric.value.toLocaleString();
  if (metric.total !== undefined) return `${value} / ${metric.total.toLocaleString()}`;
  return metric.unit ? `${value} ${metric.unit}` : value;
}

function Unavailable() {
  return <div className="small text-secondary">No telemetry available</div>;
}

function StatWidget({ config }: RendererProps) {
  const values = useContext(TelemetryContext).values;
  const descriptor = seriesMetric(config.metric);
  const points = useIngressMetric(config.metric, 0, {}, Boolean(descriptor?.ingress && config.metric !== 'ingress.sessions'));
  const last = points.at(-1);
  const metric: MetricValue | undefined = last ? { value: last.y, unit: descriptor?.unit } : values?.[config.metric];
  return (
    <>
      <div className="h1 mb-1">{metric ? displayValue(metric) : '—'}</div>
      {metric ? metric.trend && <div className="small text-secondary">{metric.trend}</div> : <Unavailable />}
    </>
  );
}

function GaugeWidget({ config }: RendererProps) {
  const metric = useContext(TelemetryContext).values?.[config.metric];
  if (!metric) return <Unavailable />;
  const value = Math.min(100, Math.max(0, metric.value));

  return (
    <>
      <div className="h2 mb-2">{value.toLocaleString()}%</div>
      <div className="progress" role="progressbar" aria-label={config.title}
        aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar" style={{ width: `${value}%` }} />
      </div>
    </>
  );
}

function TableWidget({ config }: RendererProps) {
  const entities = useContext(TelemetryContext).entities?.[config.metric];
  if (!entities?.length) return <Unavailable />;
  return (
    <table className="table table-sm">
      <thead><tr><th scope="col">Name</th><th scope="col">Status</th></tr></thead>
      <tbody>
        {entities.map(({ id, name, status }) => <tr key={id}><td>{name}</td><td>{status}</td></tr>)}
      </tbody>
    </table>
  );
}

function StatusListWidget({ config }: RendererProps) {
  const entities = useContext(TelemetryContext).entities?.[config.metric];
  if (!entities?.length) return <Unavailable />;
  return (
    <ul className="list-group list-group-flush">
      {entities.map(({ id, name, status, severity }) => (
        <li key={id} className="list-group-item px-0 d-flex justify-content-between gap-2">
          {name}<span className={`badge bg-${severity}-lt`}>{status}</span>
        </li>
      ))}
    </ul>
  );
}

function TransferHealthWidget() {
  const { values } = useContext(TelemetryContext);
  const ids = ['transfers.rate', 'transfers.latency', 'transfers.failed'];
  return (
    <>
      <dl className="list-group list-group-flush mb-3">
        {ids.map((id) => (
          <div key={id} className="list-group-item px-0 d-flex justify-content-between gap-2">
            <dt className="fw-normal text-secondary">{metricLabel(id)}</dt>
            <dd className="fw-semibold mb-0">{values?.[id] ? displayValue(values[id]) : '—'}</dd>
          </div>
        ))}
      </dl>
      {!ids.some((id) => values?.[id]) && <Unavailable />}
    </>
  );
}

export const widgetRenderers: Readonly<Record<string, ComponentType<RendererProps>>> = {
  stat: StatWidget,
  timeseries: TimeSeriesWidget,
  gauge: GaugeWidget,
  table: TableWidget,
  'status-list': StatusListWidget,
  'transfer-health': TransferHealthWidget,
};
