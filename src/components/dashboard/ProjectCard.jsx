import { ChevronDown, Check, CheckCircle, Edit2 } from 'lucide-react';
import { fmtShort } from '../../lib/utils';

const phaseColors = {
  'Kickoff': 'bg-purple-100 text-purple-700', 'Discovery': 'bg-indigo-100 text-indigo-700',
  'Strategy': 'bg-cyan-100 text-cyan-700', 'Branding': 'bg-pink-100 text-pink-700',
  'Design': 'bg-indigo-100 text-indigo-700', 'Development': 'bg-green-100 text-green-700',
  'QA': 'bg-teal-100 text-teal-700', 'Final Delivery': 'bg-emerald-100 text-emerald-700',
  'Complete': 'bg-gray-100 text-gray-700',
};

export default function ProjectCard({
  project, health, progressPct, completedCount, totalCount,
  activeTasks, currentTask, upcomingTasks, daysLeft,
  isExpanded, onToggle, onCompleteTask, onEdit, onArchive,
  canEdit,
}) {
  return (
    <div className="bg-stone-100 border border-stone-200 rounded-[6px] overflow-hidden hover:-translate-y-px transition-transform">
      <div className="p-4 cursor-pointer hover:bg-stone-200/70 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${health.dot}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium flex-shrink-0 ${phaseColors[project.phase] || 'bg-gray-100 text-gray-700'}`}>{project.phase}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium flex-shrink-0 ${health.color}`}>{health.label}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-mono flex-wrap">
                <span>{project.type}</span>
                <span>{completedCount}/{totalCount} tasks</span>
                {project.team?.am && <span className="hidden sm:inline">AM: {project.team.am}</span>}
                {daysLeft >= 0
                  ? <span className={daysLeft <= 7 ? 'text-orange-600 font-medium' : ''}>{daysLeft}d left</span>
                  : <span className="text-red-600 font-medium">{Math.abs(daysLeft)}d overdue</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs text-gray-500 w-8 text-right font-mono">{progressPct}%</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-stone-200">
          <div className="px-4 py-2 flex items-center gap-2 bg-stone-200/70 border-b border-stone-200">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs text-gray-600 font-mono font-medium">{progressPct}%</span>
            {canEdit && (
              <>
                <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 hover:bg-gray-200 rounded transition-colors ml-2" title="Edit">
                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button onClick={e => { e.stopPropagation(); onArchive(); }}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors" title={project.archived ? 'Unarchive' : 'Archive'}>
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {currentTask && (
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                <span className="gravity-label">Current Task</span>
              </div>
              <div className="flex items-start gap-3">
                <button onClick={() => onCompleteTask(currentTask.id)}
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-indigo-600 hover:bg-indigo-600 transition-all group flex items-center justify-center">
                  <Check className="w-3 h-3 text-transparent group-hover:text-white transition-colors" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{currentTask.title}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap font-mono">
                    {currentTask.assignedTo?.length > 0 && <span>{(Array.isArray(currentTask.assignedTo) ? currentTask.assignedTo : [currentTask.assignedTo]).join(', ')}</span>}
                    <span>Due {fmtShort(currentTask.dueDate)}</span>
                    {currentTask.estimatedHours && <span>{currentTask.estimatedHours}h</span>}
                    <span className={`px-2 py-0.5 rounded-full font-medium ${currentTask.priority === 'critical' ? 'bg-red-100 text-red-700' : currentTask.priority === 'high' ? 'bg-orange-100 text-orange-700' : currentTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                      {currentTask.priority?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div className="p-4">
              <div className="gravity-label mb-2">Up Next</div>
              <div className="space-y-1.5">
                {upcomingTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0" />
                    <span className="flex-1 text-gray-700 truncate">{task.title}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 font-mono">{fmtShort(task.dueDate)}</span>
                  </div>
                ))}
                {activeTasks.length > upcomingTasks.length + 1 && (
                  <div className="text-xs text-gray-400 font-mono">+{activeTasks.length - upcomingTasks.length - 1} more tasks</div>
                )}
              </div>
            </div>
          )}
          {activeTasks.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
              All tasks complete!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
