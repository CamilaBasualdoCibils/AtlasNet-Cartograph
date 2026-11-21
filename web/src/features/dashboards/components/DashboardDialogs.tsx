import { useState } from 'react';
import { isName } from '../registry';
import type { Dashboard } from '../types';
import { Dialog } from './Dialog';
import type { DashboardAction } from './DashboardHeader';

const titles: Record<DashboardAction, string> = {
  create: 'New dashboard',
  duplicate: 'Duplicate dashboard',
  rename: 'Rename dashboard',
  delete: 'Delete dashboard',
  reset: 'Reset to Default',
};

export const overviewTemplate = 'overview-template';

export function DashboardDialog({ action, dashboard, dashboards, onClose, onSubmit }: {
  action: DashboardAction;
  dashboard: Dashboard;
  dashboards: Dashboard[];
  onClose: () => void;
  onSubmit: (name: string, source: string) => void;
}) {
  const [name, setName] = useState(action === 'rename' ? dashboard.name :
    action === 'duplicate' ? `${dashboard.name.slice(0, 75)} copy` : '');
  const [source, setSource] = useState(action === 'duplicate' ? dashboard.id : '');
  const destructive = action === 'delete' || action === 'reset';

  return (
    <Dialog title={titles[action]} onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (destructive || isName(name.trim())) onSubmit(name.trim(), source);
      }}>
        <div className="modal-body d-grid gap-3">
          {destructive ? (
            <p className="mb-0">{action === 'delete'
              ? `Delete “${dashboard.name}” and its widgets?`
              : 'Restore the built-in Cluster Overview name, widgets, and layout?'}</p>
          ) : (
            <label className="form-label mb-0">
              Dashboard name
              <input className="form-control mt-1" required maxLength={80} value={name}
                onChange={(event) => setName(event.target.value)} />
            </label>
          )}
          {action === 'create' && (
            <label className="form-label mb-0">
              Start with
              <select className="form-select mt-1" value={source} onChange={(event) => setSource(event.target.value)}>
                <option value="">Empty layout</option>
                <option value={overviewTemplate}>Cluster Overview template</option>
                {dashboards.map(({ id, name: label }) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`}
            disabled={!destructive && !name.trim()}>
            {action === 'create' ? 'Create' : action === 'rename' ? 'Rename' : action === 'duplicate' ? 'Duplicate' :
              action === 'delete' ? 'Delete' : 'Restore'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
