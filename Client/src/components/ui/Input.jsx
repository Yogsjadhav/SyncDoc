import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, error, hint, id, className = '', ...props }, ref) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        ref={ref} id={inputId}
        className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors
          placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-gray-500">{hint}</p>}
      {error && <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
});
export default Input;
