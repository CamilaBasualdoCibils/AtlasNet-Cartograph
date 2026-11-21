import { verticalCompactor, type Layout } from 'react-grid-layout/core';
import { getDefinition } from './registry';
import { columns, type Breakpoint, type Dashboard, type Position, type WidgetInstance } from './types';

export const breakpoints = Object.keys(columns) as Breakpoint[];

export function emptyLayouts(): Dashboard['layouts'] {
  return { desktop: {}, tablet: {}, mobile: {} };
}

export function gridLayout(dashboard: Dashboard, breakpoint: Breakpoint): Layout {
  return dashboard.widgets.map(({ id, type }) => {
    const { minW, minH } = getDefinition(type)!.size;
    return { i: id, ...dashboard.layouts[breakpoint][id], minW, minH };
  });
}

export function positions(layout: Layout): Record<string, Position> {
  return Object.fromEntries(layout.map(({ i, x, y, w, h }) => [i, { x, y, w, h }]));
}

export function nextPosition(existing: Record<string, Position>, cols: number, w: number, h: number): Position {
  const items = Object.values(existing);
  const rows = [...new Set([0, ...items.map(({ y, h }) => y + h)])].sort((a, b) => a - b);

  for (const y of rows) {
    for (let x = 0; x <= cols - w; x += 1) {
      if (items.every((item) =>
        x + w <= item.x || item.x + item.w <= x || y + h <= item.y || item.y + item.h <= y
      )) return { x, y, w, h };
    }
  }

  return { x: 0, y: rows[rows.length - 1], w, h };
}

export function addWidget(dashboard: Dashboard, widget: WidgetInstance): Dashboard {
  const { w, h } = getDefinition(widget.type)!.size;
  const layouts = emptyLayouts();
  for (const breakpoint of breakpoints) {
    const existing = dashboard.layouts[breakpoint];
    const cols = columns[breakpoint];
    layouts[breakpoint] = { ...existing, [widget.id]: nextPosition(existing, cols, Math.min(w, cols), h) };
  }
  return { ...dashboard, widgets: [...dashboard.widgets, widget], layouts };
}

export function removeWidget(dashboard: Dashboard, id: string): Dashboard {
  const updated = { ...dashboard, widgets: dashboard.widgets.filter((widget) => widget.id !== id), layouts: emptyLayouts() };
  for (const breakpoint of breakpoints) {
    const remaining = gridLayout(dashboard, breakpoint).filter((item) => item.i !== id);
    updated.layouts[breakpoint] = positions(verticalCompactor.compact(remaining, columns[breakpoint]));
  }
  return updated;
}
