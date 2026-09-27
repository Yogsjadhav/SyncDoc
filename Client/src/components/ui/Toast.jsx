import { useEffect } from 'react';

const styles = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error:   'bg-red-50 border-red-400 text-red-800',
  info:    'bg-blue-50 border-blue-400 text-blue-800',
  warning: 'bg-amber-50 border-amber-400 text-amber-800',
};
const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

export function Toast({ message, variant = 'info', onDismiss, duration = 4000 }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div role="alert" aria-live="polite"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm ${styles[variant]}`}>
      <span className="text-base font-bold" aria-hidden="true">{icons[variant]}</span>
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="ml-2 shrink-0 rounded p-0.5 hover:opacity-70">✕</button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-full" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} variant={t.variant} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
