export function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-white rounded-[6px] border border-stone-200 ${onClick ? 'cursor-pointer hover:border-indigo-200' : ''} transition-colors ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, valueColor = 'text-stone-900', subColor = 'text-stone-500' }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-3xl font-black mb-1 ${valueColor}`}>{value}</div>
      {sub && <div className={`text-xs font-mono ${subColor}`}>{sub}</div>}
    </Card>
  );
}
