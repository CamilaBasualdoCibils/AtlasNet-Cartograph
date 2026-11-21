import type { Layout } from 'react-grid-layout';
import { addWidget, positions, removeWidget } from './layout';
import { newWidget } from './templates';
import type { Breakpoint, Dashboard, DashboardState, WidgetConfig, WidgetInstance } from './types';

export type EditAction =
  | { kind: 'add'; widget: WidgetInstance }
  | { kind: 'remove'; id: string }
  | { kind: 'duplicate'; id: string }
  | { kind: 'configure'; id: string; config: WidgetConfig }
  | { kind: 'move'; breakpoint: Breakpoint; layout: Layout };

export function editDashboard(dashboard: Dashboard, action: EditAction): Dashboard {
  switch (action.kind) {
    case 'add':
      return addWidget(dashboard, action.widget);
    case 'remove':
      return removeWidget(dashboard, action.id);
    case 'duplicate': {
      const widget = dashboard.widgets.find(({ id }) => id === action.id);
      return widget ? addWidget(dashboard, newWidget(widget.type, widget.config)) : dashboard;
    }
    case 'configure':
      return { ...dashboard, widgets: dashboard.widgets.map((widget) =>
        widget.id === action.id ? { ...widget, config: action.config } : widget) };
    case 'move':
      return { ...dashboard, layouts: { ...dashboard.layouts, [action.breakpoint]: positions(action.layout) } };
  }
}

export function commitDashboard(state: DashboardState, draft: Dashboard): DashboardState {
  return { ...state, dashboards: state.dashboards.map((dashboard) => dashboard.id === draft.id ? draft : dashboard) };
}
