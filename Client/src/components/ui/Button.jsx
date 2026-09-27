import { forwardRef } from 'react';

const variants = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 disabled:opacity-60',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-brand-500',
  ghost:     'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-brand-500',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:opacity-60',
};
const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-lg',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
      )}
      {children}
    </button>
  );
});
export default Button;
