import { AlertCircle } from 'lucide-react';

export default function AttentionBanner({ overdueTasks, overloadedMembers, projects, capacityPct }) {
  if (overdueTasks.length === 0 && overloadedMembers.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-[6px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-bold text-amber-900">Needs Attention</span>
      </div>
      <div className="space-y-2">
        {overdueTasks.slice(0, 3).map(task => {
          const proj = projects.find(p => p.id === task.projectId);
          return (
            <div key={task.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                <span className="font-medium text-gray-900">{task.title}</span>
                {proj && <span className="text-gray-500">— {proj.name}</span>}
              </div>
              <span className="text-xs text-gray-500 font-mono">
                {Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : task.assignedTo}
              </span>
            </div>
          );
        })}
        {overdueTasks.length > 3 && <div className="text-xs text-amber-700 font-medium font-mono">+{overdueTasks.length - 3} more overdue</div>}
        {overloadedMembers.slice(0, 2).map(m => (
          <div key={m.name} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
            <span className="font-medium text-gray-900">{m.name}</span>
            <span className="text-gray-500 font-mono">overloaded — {m.activeTasks} tasks ({capacityPct(m)}% capacity)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
