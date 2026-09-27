import { useEffect } from 'react';
import { useDocumentStore } from '../../store/documentStore';

/** Stacked amber banners shown when the server flags a soft conflict. */
export default function ConflictBanner() {
  const conflicts = useDocumentStore((s) => s.conflicts);
  const dismiss   = useDocumentStore((s) => s.dismissConflict);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (conflicts.length === 0) return;
    const t = setTimeout(() => dismiss(0), 8000);
    return () => clearTimeout(t);
  }, [conflicts, dismiss]);

  if (conflicts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 px-4 py-2" aria-live="polite">
      {conflicts.map((c, i) => (
        <div key={i} role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          <span className="mt-0.5 text-base" aria-hidden="true">⚡</span>
          <div className="flex-1">
            <span className="font-semibold">Conflict resolved — </span>
            {c.description}
          </div>
          <button onClick={() => dismiss(i)} aria-label="Dismiss conflict notice"
            className="ml-2 shrink-0 rounded p-0.5 text-amber-600 hover:text-amber-800
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
