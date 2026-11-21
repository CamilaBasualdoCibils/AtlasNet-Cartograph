import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commitDashboard, editDashboard } from '../src/features/dashboards/editing';
import { breakpoints, gridLayout, positions } from '../src/features/dashboards/layout';
import { defaultConfig, getDefinition, isWidgetConfig, widgetDefinitions } from '../src/features/dashboards/registry';
import { dashboardStorageKey, loadDashboards, saveDashboards } from '../src/features/dashboards/storage';
import { duplicateDashboard, initialState, newWidget, overview, overviewId } from '../src/features/dashboards/templates';
import { columns } from '../src/features/dashboards/types';
import { widgetRenderers } from '../src/features/dashboards/widgets/renderers';

function memoryStorage(raw?: string) {
  const entries = new Map(raw === undefined ? [] : [[dashboardStorageKey, raw]]);
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
  };
}

test('every registered widget has a renderer and valid configuration defaults', () => {
  assert.deepEqual(widgetDefinitions.map(({ id }) => id).sort(), Object.keys(widgetRenderers).sort());
  for (const definition of widgetDefinitions) assert.ok(isWidgetConfig(definition.id, defaultConfig(definition)));
  assert.equal(getDefinition('constructor'), undefined);
  assert.equal(isWidgetConfig('stat', { title: 'Invalid', metric: 'gone' }), false);
  assert.equal(isWidgetConfig('timeseries', { ...newWidget('timeseries').config, range: '7m' }), false);
});

test('Cluster Overview preserves the exact desktop positions and fits each breakpoint', () => {
  const dashboard = overview();
  assert.deepEqual(Object.values(dashboard.layouts.desktop), [
    { x: 0, y: 0, w: 4, h: 2 }, { x: 4, y: 0, w: 4, h: 2 }, { x: 8, y: 0, w: 4, h: 2 },
    { x: 0, y: 2, w: 8, h: 4 }, { x: 8, y: 2, w: 4, h: 4 },
  ]);
  for (const breakpoint of breakpoints) {
    assert.deepEqual(positions(gridLayout(dashboard, breakpoint)), dashboard.layouts[breakpoint]);
    assert.ok(gridLayout(dashboard, breakpoint).every(({ x, w }) => x + w <= columns[breakpoint]));
  }
});

test('storage round-trips custom configurations, layouts, and the selected dashboard', () => {
  const state = initialState();
  const copy = duplicateDashboard(overview(), 'Operations');
  copy.layouts.tablet[copy.widgets[0].id].h += 1;
  copy.widgets[0].config.title = 'Custom clients';
  state.dashboards.push(copy);
  state.selectedId = copy.id;
  const storage = memoryStorage();
  saveDashboards(storage, state);
  assert.deepEqual(loadDashboards(storage), state);
  assert.notEqual(copy.widgets[0].id, state.dashboards[0].widgets[0].id);
});

test('invalid or outdated data falls back, preserving other valid dashboards when possible', () => {
  assert.deepEqual(loadDashboards(memoryStorage('{')), initialState());
  assert.deepEqual(loadDashboards(memoryStorage('{"version":0}')), initialState());
  const state = initialState();
  const valid = duplicateDashboard(overview(), 'Valid copy');
  state.dashboards.push(valid);
  state.dashboards[0].layouts.mobile['overview-clients'].w = 50;
  const restored = loadDashboards(memoryStorage(JSON.stringify(state)));
  assert.deepEqual(restored.dashboards, [overview(), valid]);
  assert.equal(restored.selectedId, overviewId);
});

test('edit actions change only the draft until commit and keep duplicate instances independent', () => {
  const saved = initialState();
  const original = saved.dashboards[0];
  const first = original.widgets[0];
  const extra = newWidget('stat');
  let draft = editDashboard(original, { kind: 'add', widget: extra });
  draft = editDashboard(draft, { kind: 'duplicate', id: first.id });
  const duplicate = draft.widgets.at(-1)!;
  draft = editDashboard(draft, { kind: 'configure', id: duplicate.id, config: { ...duplicate.config, title: 'Replica' } });
  draft = editDashboard(draft, { kind: 'remove', id: extra.id });
  draft = editDashboard(draft, {
    kind: 'move', breakpoint: 'desktop',
    layout: gridLayout(draft, 'desktop').map((item) => item.i === duplicate.id ? { ...item, h: item.h + 1 } : item),
  });
  assert.deepEqual(saved, initialState());
  assert.equal(draft.widgets[0].config.title, 'Connected Clients');
  assert.equal(draft.widgets.at(-1)?.config.title, 'Replica');
  assert.notEqual(duplicate.id, first.id);
  assert.equal(draft.layouts.desktop[duplicate.id].h, 3);
  assert.equal(draft.layouts.mobile[duplicate.id].h, 2);
  assert.deepEqual(commitDashboard(saved, draft).dashboards, [draft]);
});

test('version-one users keep their layout and customized widget titles', () => {
  const state = initialState();
  const original = state.dashboards[0];
  const duplicate = duplicateDashboard(original, 'User dashboard');
  const activity = original.widgets.find(({ id }) => id === 'overview-activity')!;
  activity.config.title = 'Command & Signal Activity';
  const custom = duplicate.widgets.find(({ type }) => type === 'timeseries')!;
  custom.config.title = 'My chart';
  duplicate.layouts.mobile[custom.id].h += 2;
  for (const widget of [activity, custom]) {
    delete widget.config.node;
    delete widget.config.listener;
    delete widget.config.endpoint;
  }
  const restored = loadDashboards(memoryStorage(JSON.stringify({
    ...state, version: 1, selectedId: duplicate.id, dashboards: [original, duplicate],
  })));
  assert.equal(restored.selectedId, duplicate.id);
  assert.equal(restored.dashboards[0].widgets.find(({ id }) => id === activity.id)?.config.title, 'Command & Signal Ingress');
  assert.equal(restored.dashboards[1].widgets.find(({ id }) => id === custom.id)?.config.title, 'My chart');
  assert.deepEqual(restored.dashboards[1].layouts, duplicate.layouts);
});
