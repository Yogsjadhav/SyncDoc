import { useEffect } from 'react';

export default function Drawer({ open, onClose, title, children, side = 'right' }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true" onClick={onClose}
      />
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`fixed top-0 z-50 flex h-full w-80 max-w-full flex-col bg-white shadow-2xl
          transition-transform duration-300
          ${side === 'right' ? 'right-0' : 'left-0'}
          ${open ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="Close panel"
            className="rounded p-1 text-gray-400 hover:text-gray-600
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
