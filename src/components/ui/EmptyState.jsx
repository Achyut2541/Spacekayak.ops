export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-10 text-center text-stone-400">
      {Icon && <Icon className="w-10 h-10 mx-auto mb-3 opacity-30" />}
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
