export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm',
  };
  return (
    <div className={`${sizes[size]} bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className="text-white font-semibold">{name?.[0] || '?'}</span>
    </div>
  );
}
