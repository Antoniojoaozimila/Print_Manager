import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="modal-backdrop" aria-label="Fechar" onClick={onClose} />
      <div
        className={`modal-panel ${wide ? 'max-w-4xl' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-panel-header">
          <h2 id="modal-title" className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="btn-imperial-ghost text-lg leading-none" aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
