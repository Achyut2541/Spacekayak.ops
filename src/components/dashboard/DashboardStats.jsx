export default function DashboardStats({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-stone-100 border border-stone-200 rounded-[6px] p-4 hover:-translate-y-px transition-transform">
          <div className="gravity-label mb-2">{s.label}</div>
          <div className={`text-[1.9rem] font-light font-serif mb-1 ${s.valueColor}`}>{s.value}</div>
          <div className={`text-xs font-mono ${s.subColor}`}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
