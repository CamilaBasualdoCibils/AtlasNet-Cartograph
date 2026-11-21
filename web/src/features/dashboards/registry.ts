import {
  IconActivity, IconGauge, IconListCheck, IconNumbers, IconTable, IconTransfer,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { metrics, ranges, scopeFields } from './metrics';
import type { WidgetConfig } from './types';

interface Option {
  id: string;
  label: string;
}

interface Field {
  name: string;
  label: string;
  options?: readonly Option[];
  initial: string;
}

interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  size: { w: number; h: number; minW: number; minH: number };
  fields: readonly Field[];
}

const scalarMetrics = metrics.filter(({ kind }) => kind === 'stat' || kind === 'timeseries');
const timeSeriesMetrics = metrics.filter(({ kind }) => kind === 'timeseries');
const percentages = metrics.filter(({ kind }) => kind === 'percent');
const entities = metrics.filter(({ kind }) => kind === 'entities');

export const widgetDefinitions: readonly WidgetDefinition[] = [
  {
    id: 'stat', name: 'Statistic', description: 'A single metric with an optional trend.', icon: IconNumbers,
    size: { w: 4, h: 2, minW: 3, minH: 2 },
    fields: [{ name: 'metric', label: 'Metric', options: scalarMetrics, initial: 'clients.connected' }],
  },
  {
    id: 'timeseries', name: 'Time series', description: 'Compare operation rates over time.', icon: IconActivity,
    size: { w: 8, h: 4, minW: 4, minH: 3 },
    fields: [
      { name: 'metric', label: 'Primary metric', options: timeSeriesMetrics, initial: 'commands.rate' },
      { name: 'secondMetric', label: 'Secondary metric', options: [{ id: '', label: 'None' }, ...timeSeriesMetrics], initial: 'signals.rate' },
      { name: 'range', label: 'Default time range', options: ranges, initial: '15m' },
      ...scopeFields.map((field) => ({ ...field, initial: '' })),
    ],
  },
  {
    id: 'gauge', name: 'Gauge', description: 'Track a percentage on a bounded scale.', icon: IconGauge,
    size: { w: 4, h: 2, minW: 3, minH: 2 },
    fields: [{ name: 'metric', label: 'Metric', options: percentages, initial: 'nodes.healthy-percent' }],
  },
  {
    id: 'table', name: 'Table', description: 'View entity names and statuses in rows.', icon: IconTable,
    size: { w: 6, h: 3, minW: 4, minH: 2 },
    fields: [{ name: 'metric', label: 'Entity data', options: entities, initial: 'nodes.status' }],
  },
  {
    id: 'status-list', name: 'Status list', description: 'Scan status indicators for a group of entities.', icon: IconListCheck,
    size: { w: 4, h: 3, minW: 3, minH: 2 },
    fields: [{ name: 'metric', label: 'Entity data', options: entities, initial: 'shards.status' }],
  },
  {
    id: 'transfer-health', name: 'Transfer health', description: 'Monitor transfer throughput, latency, and failures.', icon: IconTransfer,
    size: { w: 4, h: 4, minW: 4, minH: 4 },
    fields: [],
  },
];

export function getDefinition(type: string) {
  return widgetDefinitions.find((definition) => definition.id === type);
}

export function defaultConfig(definition: WidgetDefinition): WidgetConfig {
  return { title: definition.name, ...Object.fromEntries(definition.fields.map(({ name, initial }) => [name, initial])) };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isName(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && value.trim().length > 0;
}

export function isWidgetConfig(type: string, value: unknown): value is WidgetConfig {
  const definition = getDefinition(type);
  return Boolean(definition && isRecord(value) && isName(value.title) &&
    Object.keys(value).length === definition.fields.length + 1 &&
    definition.fields.every(({ name, options }) => {
      const field = value[name];
      return options ? options.some(({ id }) => id === field)
        : typeof field === 'string' && field.length <= 128 && !/[\x00-\x1f\x7f]/.test(field);
    }));
}
