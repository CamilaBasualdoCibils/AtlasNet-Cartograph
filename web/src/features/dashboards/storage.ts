import { breakpoints } from './layout';
import { scopeFields } from './metrics';
import { getDefinition, isName, isRecord, isWidgetConfig } from './registry';
import { initialState, overview, overviewId } from './templates';
import { columns, type Dashboard, type DashboardState, type WidgetInstance } from './types';

export const dashboardStorageKey = 'cartograph.dashboards';

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[\w-]{1,80}$/.test(value) && !Object.hasOwn(Object.prototype, value);
}

function isWidget(value: unknown): value is WidgetInstance {
  return isRecord(value) && isId(value.id) && typeof value.type === 'string' &&
    isWidgetConfig(value.type, value.config);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isDashboard(value: unknown): value is Dashboard {
  if (!isRecord(value) || !isId(value.id) || !isName(value.name) ||
      !Array.isArray(value.widgets) || !value.widgets.every(isWidget) ||
      new Set(value.widgets.map(({ id }) => id)).size !== value.widgets.length ||
      !isRecord(value.layouts)) return false;

  const { widgets, layouts } = value;
  return breakpoints.every((breakpoint) => {
    const layout = layouts[breakpoint];
    if (!isRecord(layout) || Object.keys(layout).length !== widgets.length) return false;

    return widgets.every(({ id, type }) => {
      const item = layout[id];
      if (!isRecord(item)) return false;
      const { x, y, w, h } = item;
      const { minW, minH } = getDefinition(type)!.size;
      return isInteger(x) && x >= 0 && isInteger(y) && y >= 0 &&
        isInteger(w) && w >= minW && x + w <= columns[breakpoint] &&
        isInteger(h) && h >= minH && Number.isSafeInteger(y + h);
    });
  });
}

type DashboardStorage = Pick<Storage, 'getItem' | 'setItem'>;

function upgradeDashboard(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.widgets)) return value;
  return {
    ...value,
    widgets: value.widgets.map((widget: unknown) => {
      if (!isRecord(widget) || widget.type !== 'timeseries' || !isRecord(widget.config)) return widget;
      const config = {
        ...Object.fromEntries(scopeFields.map(({ name }) => [name, ''])),
        ...widget.config,
      };
      if (value.id === overviewId && widget.id === 'overview-activity' &&
          config.title === 'Command & Signal Activity') config.title = 'Command & Signal Ingress';
      return { ...widget, config };
    }),
  };
}

export function loadDashboards(storage: DashboardStorage): DashboardState {
  try {
    const raw = storage.getItem(dashboardStorageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!isRecord(parsed) || (parsed.version !== 1 && parsed.version !== 2) || !Array.isArray(parsed.dashboards)) return initialState();

    const dashboards = (parsed.version === 1 ? parsed.dashboards.map(upgradeDashboard) : parsed.dashboards).filter(isDashboard);
    if (!dashboards.some(({ id }) => id === overviewId)) dashboards.unshift(overview());
    const distinct = [...new Map(dashboards.map((dashboard) => [dashboard.id, dashboard])).values()];
    const selectedId = distinct.find(({ id }) => id === parsed.selectedId)?.id ?? overviewId;
    return { version: 2, dashboards: distinct, selectedId };
  } catch {
    return initialState();
  }
}

export function saveDashboards(storage: DashboardStorage, state: DashboardState) {
  storage.setItem(dashboardStorageKey, JSON.stringify(state));
}
