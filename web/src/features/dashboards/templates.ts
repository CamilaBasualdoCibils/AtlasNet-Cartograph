import { addWidget, breakpoints, emptyLayouts } from './layout';
import { defaultConfig, getDefinition } from './registry';
import type { Dashboard, DashboardState, WidgetInstance } from './types';

export const overviewId = 'cluster-overview';

function createId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function newWidget(type: string, config: Record<string, string> = {}, id = createId()): WidgetInstance {
  return { id, type, config: { ...defaultConfig(getDefinition(type)!), ...config } };
}

export function emptyDashboard(name: string, id = createId()): Dashboard {
  return { id, name, widgets: [], layouts: emptyLayouts() };
}

export function overview(): Dashboard {
  const widgets = [
    newWidget('stat', { title: 'Connected Clients', metric: 'clients.connected' }, 'overview-clients'),
    newWidget('stat', { title: 'Healthy Nodes', metric: 'nodes.healthy' }, 'overview-nodes'),
    newWidget('stat', { title: 'Running Shards', metric: 'shards.running' }, 'overview-shards'),
    newWidget('timeseries', { title: 'Command & Signal Ingress' }, 'overview-activity'),
    newWidget('transfer-health', { title: 'Transfer Health' }, 'overview-transfers'),
  ];
  return widgets.reduce(addWidget, emptyDashboard('Cluster Overview', overviewId));
}

export function initialState(): DashboardState {
  return { version: 2, selectedId: overviewId, dashboards: [overview()] };
}

export function duplicateDashboard(source: Dashboard, name: string): Dashboard {
  const copy = emptyDashboard(name);
  for (const widget of source.widgets) {
    const clone = newWidget(widget.type, widget.config);
    copy.widgets.push(clone);
    for (const breakpoint of breakpoints) {
      copy.layouts[breakpoint][clone.id] = { ...source.layouts[breakpoint][widget.id] };
    }
  }
  return copy;
}
