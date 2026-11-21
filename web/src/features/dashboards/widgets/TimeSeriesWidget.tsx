import { lazy, Suspense, useContext, useId, useMemo, useState } from 'react';
import { metricLabel, ranges, seriesMetric } from '../metrics';
import { useIngressMetric } from '../ingressTelemetry';
import type { IngressScope } from '../../../api/ingressTelemetry';
import { TelemetryContext } from '../telemetry';
import type { WidgetConfig } from '../types';

const TimeSeriesChart = lazy(async () => ({
  default: (await import('../charts/TimeSeriesChart')).TimeSeriesChart,
}));

export function TimeSeriesWidget({ config }: { config: WidgetConfig }) {
  const [range, setRange] = useState(config.range);
  const rangeId = useId();
  const { history } = useContext(TelemetryContext);
  const scope: IngressScope = {};
  if (config.node.trim()) scope.node = config.node.trim();
  if (config.listener.trim()) scope.listener = config.listener.trim();
  if (config.endpoint.trim()) scope.endpoint = config.endpoint.trim();
  const duration = ranges.find(({ id }) => id === range)!.minutes * 60;
  const allowsIngress = (id: string) => Boolean(seriesMetric(id)?.ingress &&
    (id !== 'ingress.sessions' || scope.listener || scope.endpoint));
  const first = useIngressMetric(config.metric, duration, scope, allowsIngress(config.metric));
  const second = useIngressMetric(config.secondMetric, duration, scope,
    config.secondMetric !== config.metric && allowsIngress(config.secondMetric));

  const series = useMemo(() => {
    const since = Date.now() - duration * 1000;
    return [...new Set([config.metric, config.secondMetric].filter(Boolean))].map((id, index) => {
      const descriptor = seriesMetric(id);
      return {
        name: metricLabel(id),
        unit: descriptor?.unit ?? '',
        color: index === 0 ? '#4299e1' : '#ae3ec9',
        points: descriptor?.ingress ? (index === 0 ? first : second)
          : history?.[id]?.filter(({ x }) => x >= since) ?? [],
      };
    });
  }, [config.metric, config.secondMetric, duration, first, history, second]);
  const hasData = series.some(({ points }) => points.length > 0);

  return (
    <div className="d-flex flex-column gap-2 h-100">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <ul className="list-inline mb-0 small text-secondary">
          {series.map(({ name, color }) => (
            <li className="list-inline-item" key={name}>
              <span className="badge badge-dot me-1" style={{ backgroundColor: color }} />{name}
            </li>
          ))}
        </ul>
        <label className="visually-hidden" htmlFor={rangeId}>{config.title} time range</label>
        <select className="form-select form-select-sm w-auto" id={rangeId} value={range}
          onChange={(event) => setRange(event.target.value)}>
          {ranges.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      <div className="dashboard-chart flex-fill">
        {hasData ? (
          <Suspense fallback={<div className="dashboard-chart-empty text-secondary small">Loading chart…</div>}>
            <TimeSeriesChart label={config.title} series={series} />
          </Suspense>
        ) : <div className="dashboard-chart-empty text-secondary small">No telemetry available</div>}
      </div>
    </div>
  );
}
