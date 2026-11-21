import { IconLayoutDashboard } from '@tabler/icons-react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { IngressTelemetry } from '../../api/ingressTelemetry';
import { IngressTelemetryContext } from './ingressTelemetry';
import { ChartThemeContext } from './charts/theme';
import { DashboardDialog, overviewTemplate } from './components/DashboardDialogs';
import { DashboardGrid } from './components/DashboardGrid';
import { DashboardHeader, type DashboardAction } from './components/DashboardHeader';
import { WidgetConfigDialog, WidgetLibrary } from './components/WidgetDialogs';
import { commitDashboard, editDashboard, type EditAction } from './editing';
import { loadDashboards, saveDashboards } from './storage';
import { duplicateDashboard, emptyDashboard, newWidget, overview, overviewId } from './templates';
import type { Dashboard, DashboardState, WidgetInstance } from './types';
import './dashboard.css';

type ActiveDialog =
  | { kind: 'library' }
  | { kind: 'widget'; widget: WidgetInstance }
  | { kind: 'dashboard'; action: DashboardAction };

export function DashboardPage({ dark }: { dark: boolean }) {
  const telemetry = useMemo(() => new IngressTelemetry(), []);
  const telemetryError = useSyncExternalStore(telemetry.subscribeError, telemetry.getError);
  const [saved, setSaved] = useState(() => loadDashboards(localStorage));
  const [draft, setDraft] = useState<Dashboard | null>(null);
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [error, setError] = useState('');
  const dashboard = draft ?? saved.dashboards.find(({ id }) => id === saved.selectedId)!;
  const closeDialog = () => setDialog(null);

  function persist(next: DashboardState) {
    try {
      saveDashboards(localStorage, next);
      setSaved(next);
      setError('');
      return true;
    } catch {
      setError('Cartograph could not save your dashboards in this browser.');
      return false;
    }
  }

  function updateDraft(action: EditAction) {
    setDraft((current) => current ? editDashboard(current, action) : current);
  }

  function manage(action: DashboardAction, name: string, sourceId: string) {
    let next: DashboardState;
    switch (action) {
      case 'create':
      case 'duplicate': {
        const source = sourceId === overviewTemplate ? overview() : saved.dashboards.find(({ id }) => id === sourceId);
        const created = source ? duplicateDashboard(source, name) : emptyDashboard(name);
        next = { ...saved, selectedId: created.id, dashboards: [...saved.dashboards, created] };
        break;
      }
      case 'rename':
        next = commitDashboard(saved, { ...dashboard, name });
        break;
      case 'delete':
        next = { ...saved, selectedId: overviewId, dashboards: saved.dashboards.filter(({ id }) => id !== dashboard.id) };
        break;
      case 'reset':
        next = commitDashboard({ ...saved, selectedId: overviewId }, overview());
        break;
    }
    persist(next);
    closeDialog();
  }

  return (
    <IngressTelemetryContext.Provider value={telemetry}>
      <ChartThemeContext.Provider value={dark}>
        <DashboardHeader dashboard={dashboard} dashboards={saved.dashboards} editing={Boolean(draft)}
          onSelect={(id) => persist({ ...saved, selectedId: id })}
          onManage={(action) => setDialog({ kind: 'dashboard', action })}
          onEdit={() => { setError(''); setDraft(dashboard); }}
          onAdd={() => setDialog({ kind: 'library' })}
          onCancel={() => { setError(''); setDraft(null); }}
          onSave={() => { if (draft && persist(commitDashboard(saved, draft))) setDraft(null); }}
        />
        {telemetryError && <div className="alert alert-warning" role="status">{telemetryError}</div>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {!dashboard.widgets.length && (
          <div className="card">
            <div className="empty py-5">
              <div className="empty-icon"><IconLayoutDashboard size={32} aria-hidden /></div>
              <p className="empty-title">No widgets yet</p>
              <p className="empty-subtitle text-secondary">
                {draft ? 'Use Add Widget to choose your first widget.' : 'Edit this dashboard to add widgets.'}
              </p>
            </div>
          </div>
        )}
        <DashboardGrid key={dashboard.id} dashboard={dashboard} editing={Boolean(draft)}
          onEdit={updateDraft} onConfigure={(widget) => setDialog({ kind: 'widget', widget })} />
        {dialog?.kind === 'library' && (
          <WidgetLibrary onClose={closeDialog} onAdd={(type) => {
            updateDraft({ kind: 'add', widget: newWidget(type) });
            closeDialog();
          }} />
        )}
        {dialog?.kind === 'widget' && (
          <WidgetConfigDialog widget={dialog.widget} onClose={closeDialog} onSave={(config) => {
            updateDraft({ kind: 'configure', id: dialog.widget.id, config });
            closeDialog();
          }} />
        )}
        {dialog?.kind === 'dashboard' && (
          <DashboardDialog action={dialog.action} dashboard={dashboard} dashboards={saved.dashboards}
            onClose={closeDialog} onSubmit={(name, source) => manage(dialog.action, name, source)} />
        )}
      </ChartThemeContext.Provider>
    </IngressTelemetryContext.Provider>
  );
}
