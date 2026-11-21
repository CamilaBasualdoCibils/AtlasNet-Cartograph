import { IconEdit, IconPlus } from '@tabler/icons-react';
import type { Dashboard } from '../types';
import { overviewId } from '../templates';

export type DashboardAction = 'create' | 'duplicate' | 'rename' | 'delete' | 'reset';

interface DashboardHeaderProps {
  dashboard: Dashboard;
  dashboards: Dashboard[];
  editing: boolean;
  onSelect: (id: string) => void;
  onManage: (action: DashboardAction) => void;
  onEdit: () => void;
  onAdd: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function DashboardHeader({
  dashboard, dashboards, editing, onSelect, onManage, onEdit, onAdd, onSave, onCancel,
}: DashboardHeaderProps) {
  return (
    <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
      <div>
        <h1 className="page-title mb-2">{dashboard.name}</h1>
        <label className="visually-hidden" htmlFor="dashboard-select">Dashboard</label>
        <select className="form-select dashboard-select" id="dashboard-select" value={dashboard.id}
          disabled={editing} onChange={(event) => onSelect(event.target.value)}>
          {dashboards.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      {editing ? (
        <div className="d-flex flex-wrap gap-2">
          <button className="btn" onClick={onAdd}><IconPlus size={18} className="me-1" aria-hidden /> Add Widget</button>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave}>Save</button>
        </div>
      ) : (
        <div className="d-flex flex-wrap align-items-center gap-2">
          <label className="visually-hidden" htmlFor="dashboard-actions">Dashboard actions</label>
          <select className="form-select w-auto" id="dashboard-actions" value=""
            onChange={(event) => onManage(event.target.value as DashboardAction)}>
            <option value="" disabled>Dashboard actions</option>
            <option value="create">New dashboard</option>
            <option value="duplicate">Duplicate dashboard</option>
            <option value="rename">Rename dashboard</option>
            {dashboard.id !== overviewId && <option value="delete">Delete dashboard</option>}
            <option value="reset">Reset to Default</option>
          </select>
          <button className="btn btn-primary" onClick={onEdit}>
            <IconEdit size={18} className="me-1" aria-hidden /> Edit Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
