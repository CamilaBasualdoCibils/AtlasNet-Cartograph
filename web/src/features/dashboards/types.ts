export const columns = { desktop: 12, tablet: 8, mobile: 4 } as const;
export type Breakpoint = keyof typeof columns;

export interface Position {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetInstance {
  id: string;
  type: string;
  config: WidgetConfig;
}

export interface WidgetConfig {
  title: string;
  [field: string]: string;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: WidgetInstance[];
  layouts: Record<Breakpoint, Record<string, Position>>;
}

export interface DashboardState {
  version: 2;
  selectedId: string;
  dashboards: Dashboard[];
}
