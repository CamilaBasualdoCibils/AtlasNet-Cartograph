import { IconCopy, IconGripVertical, IconSettings, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import GridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import type { EditAction } from '../editing';
import { gridLayout } from '../layout';
import { getDefinition } from '../registry';
import { columns, type Dashboard, type WidgetInstance } from '../types';
import { widgetRenderers } from '../widgets/renderers';

function WidgetCard({ widget, editing, onEdit, onConfigure }: {
  widget: WidgetInstance; editing: boolean; onEdit: (action: EditAction) => void; onConfigure: () => void;
}) {
  const { config, id, type } = widget;
  const Icon = getDefinition(type)!.icon;
  const Renderer = widgetRenderers[type];

  return (
    <article className="card h-100 dashboard-widget">
      <div className="card-header dashboard-widget-header gap-2">
        {editing && <span className="dashboard-drag-handle text-secondary" title="Drag to move"><IconGripVertical size={18} aria-hidden /></span>}
        <Icon size={18} aria-hidden />
        <h2 className="card-title text-truncate" title={config.title}>{config.title}</h2>
        {editing && (
          <div className="ms-auto d-flex dashboard-widget-actions">
            <button className="btn btn-sm btn-icon btn-ghost-secondary" title="Configure widget"
              aria-label={`Configure ${config.title}`} onClick={onConfigure}><IconSettings size={17} aria-hidden /></button>
            <button className="btn btn-sm btn-icon btn-ghost-secondary" title="Duplicate widget"
              aria-label={`Duplicate ${config.title}`} onClick={() => onEdit({ kind: 'duplicate', id })}><IconCopy size={17} aria-hidden /></button>
            <button className="btn btn-sm btn-icon btn-ghost-danger" title="Remove widget"
              aria-label={`Remove ${config.title}`} onClick={() => onEdit({ kind: 'remove', id })}><IconTrash size={17} aria-hidden /></button>
          </div>
        )}
      </div>
      <div className="card-body dashboard-widget-body">
        <Renderer key={JSON.stringify(config)} config={config} />
      </div>
    </article>
  );
}

export function DashboardGrid({ dashboard, editing, onEdit, onConfigure }: {
  dashboard: Dashboard; editing: boolean; onEdit: (action: EditAction) => void;
  onConfigure: (widget: WidgetInstance) => void;
}) {
  const { width, containerRef, mounted } = useContainerWidth();
  const breakpoint = width >= 900 ? 'desktop' : width >= 560 ? 'tablet' : 'mobile';
  const layout = useMemo(() => gridLayout(dashboard, breakpoint), [dashboard, breakpoint]);

  function savePosition(next: Layout) {
    if (editing) onEdit({ kind: 'move', layout: next, breakpoint });
  }

  return (
    <div ref={containerRef}>
      {mounted && dashboard.widgets.length > 0 && (
        <GridLayout
          key={breakpoint}
          className={editing ? 'dashboard-grid-editing' : undefined}
          width={width}
          layout={layout}
          gridConfig={{ cols: columns[breakpoint], rowHeight: 60, margin: [12, 12], containerPadding: [0, 0] }}
          dragConfig={{ enabled: editing, handle: '.dashboard-drag-handle' }}
          resizeConfig={{ enabled: editing, handles: ['e', 's', 'se'] }}
          onDragStop={savePosition}
          onResizeStop={savePosition}
        >
          {dashboard.widgets.map((widget) => (
            <div key={widget.id}>
              <WidgetCard widget={widget} editing={editing} onEdit={onEdit}
                onConfigure={() => onConfigure(widget)} />
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
