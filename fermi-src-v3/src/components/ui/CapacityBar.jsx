export function CapacityBar({ pct, size = 'md' }) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  const color =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-500' :
    pct >= 40 ? 'bg-indigo-500' :
    'bg-emerald-500';

  return (
    <div className={`w-full ${h} bg-stone-200 rounded-full overflow-hidden`}>
      <div
        className={`${h} ${color} rounded-full transition-all`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export function ProgressBar({ pct, color = 'bg-indigo-500', size = 'sm' }) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  return (
    <div className={`w-full ${h} bg-stone-200 rounded-full overflow-hidden`}>
      <div
        className={`${h} ${color} rounded-full transition-all`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}
