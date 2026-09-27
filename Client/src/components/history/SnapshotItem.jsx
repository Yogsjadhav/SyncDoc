export default function SnapshotItem({ snapshot, selected, onSelect, onRestore, restoring }) {
  const date = new Date(snapshot.createdAt).toLocaleString();
  return (
    <div
      className={`cursor-pointer rounded-lg border px-4 py-3 transition-colors
        ${selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
      onClick={() => onSelect(snapshot)}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(snapshot)}
      aria-pressed={selected}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800">
            Version {snapshot.version}
            {snapshot.label && <span className="ml-2 text-xs text-gray-500">{snapshot.label}</span>}
          </p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        {selected && (
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(snapshot); }}
            disabled={restoring}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white
              hover:bg-brand-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {restoring ? 'Restoring…' : 'Restore'}
          </button>
        )}
      </div>
    </div>
  );
}
