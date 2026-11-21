import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { getDefinition, isWidgetConfig, widgetDefinitions } from '../registry';
import type { WidgetConfig, WidgetInstance } from '../types';
import { Dialog } from './Dialog';

export function WidgetLibrary({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) {
  return (
    <Dialog title="Add Widget" onClose={onClose}>
      <div className="modal-body">
        <ul className="list-group list-group-flush">
          {widgetDefinitions.map(({ id, name, description, icon: Icon }) => (
            <li key={id} className="list-group-item px-0 d-flex align-items-center gap-3">
              <span className="avatar bg-primary-lt flex-shrink-0"><Icon size={20} aria-hidden /></span>
              <div className="flex-fill">
                <div className="fw-semibold">{name}</div>
                <div className="text-secondary small">{description}</div>
              </div>
              <button type="button" className="btn btn-sm" aria-label={`Add ${name}`} onClick={() => onAdd(id)}>
                <IconPlus size={16} className="me-1" aria-hidden /> Add
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

export function WidgetConfigDialog({ widget, onSave, onClose }: {
  widget: WidgetInstance; onSave: (config: WidgetConfig) => void; onClose: () => void;
}) {
  const [config, setConfig] = useState(widget.config);
  const definition = getDefinition(widget.type)!;

  return (
    <Dialog title="Configure Widget" onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        const next = { ...config, title: config.title.trim() };
        if (isWidgetConfig(widget.type, next)) onSave(next);
      }}>
        <div className="modal-body d-grid gap-3">
          <label className="form-label mb-0">
            Widget title
            <input className="form-control mt-1" required maxLength={80} value={config.title}
              onChange={(event) => setConfig({ ...config, title: event.target.value })} />
          </label>
          {widget.type === 'timeseries' && <div className="text-secondary small">Leave scope fields blank for the entire cluster. Session counts require a listener or endpoint.</div>}
          {definition.fields.map(({ name, label, options }) => (
            <label key={name} className="form-label mb-0">
              {label}
              {options ? (
                <select className="form-select mt-1" value={config[name]}
                  onChange={(event) => setConfig({ ...config, [name]: event.target.value })}>
                  {options.map(({ id, label: text }) => <option key={id} value={id}>{text}</option>)}
                </select>
              ) : (
                <input className="form-control mt-1" maxLength={128} value={config[name]}
                  placeholder="All" onChange={(event) => setConfig({ ...config, [name]: event.target.value })} />
              )}
            </label>
          ))}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!config.title.trim()}>Apply</button>
        </div>
      </form>
    </Dialog>
  );
}
