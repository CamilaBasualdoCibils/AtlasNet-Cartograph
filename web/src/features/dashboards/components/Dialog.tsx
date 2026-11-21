import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog ref={ref} className="dashboard-dialog" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title" id={titleId}>{title}</h2>
          <button className="btn-close" type="button" aria-label="Close" onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
