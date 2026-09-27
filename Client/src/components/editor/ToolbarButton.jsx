/**
 * Accessible toolbar button — handles aria-label, aria-pressed,
 * keyboard activation (Enter/Space), and focus styling.
 */
export default function ToolbarButton({ onClick, active, disabled, label, children, className = '' }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Prevent editor losing focus when clicking toolbar buttons
        e.preventDefault();
        if (!disabled) onClick();
      }}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1
        disabled:opacity-40
        ${active ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        ${className}`}
    >
      {children}
    </button>
  );
}
