import { createContext } from 'react';

export interface MetricValue {
  value: number;
  total?: number;
  unit?: string;
  trend?: string;
}

export interface MetricPoint {
  x: number;
  y: number;
}

export interface EntityStatus {
  id: string;
  name: string;
  status: string;
  severity: 'success' | 'warning' | 'danger' | 'secondary';
}

// A future provider supplies reactive snapshots to every widget through this context.
export interface TelemetrySnapshot {
  values?: Readonly<Record<string, MetricValue>>;
  history?: Readonly<Record<string, readonly MetricPoint[]>>;
  entities?: Readonly<Record<string, readonly EntityStatus[]>>;
}

export const TelemetryContext = createContext<TelemetrySnapshot>({});
