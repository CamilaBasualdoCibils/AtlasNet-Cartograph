import type { MetricPoint } from '../telemetry';
import { DashboardChart } from './DashboardChart';

export interface TimeSeries {
  name: string;
  color: string;
  unit: string;
  points: readonly MetricPoint[];
}

export function TimeSeriesChart({ label, series }: { label: string; series: TimeSeries[] }) {
  const units = [...new Set(series.map(({ unit }) => unit))];
  return (
    <DashboardChart label={label} option={{
      animation: false,
      color: series.map(({ color }) => color),
      grid: { left: 48, right: units.length > 1 ? 48 : 16, top: 24, bottom: 28 },
      tooltip: { trigger: 'axis', renderMode: 'richText' },
      xAxis: { type: 'time', splitNumber: 4 },
      yAxis: units.map((unit) => ({ type: 'value', name: unit, min: 0, splitNumber: 3 })),
      series: series.map(({ name, points, unit }) => ({
        type: 'line',
        yAxisIndex: units.indexOf(unit),
        name,
        showSymbol: points.length === 1,
        data: points.map(({ x, y }) => [x, y]),
      })),
    }} />
  );
}
