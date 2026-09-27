const sizes = { xs:'h-6 w-6 text-xs', sm:'h-7 w-7 text-xs', md:'h-8 w-8 text-sm', lg:'h-10 w-10 text-base' };

export default function Avatar({ name, color, size = 'md', className = '', title }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white
        ring-2 ring-white select-none ${sizes[size]} ${className}`}
      style={{ backgroundColor: color }}
      title={title ?? name}
      aria-label={title ?? name}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
