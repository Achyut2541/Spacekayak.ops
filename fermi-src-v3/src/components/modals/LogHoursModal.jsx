import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';

export default function LogHoursModal() {
  const { loggingHoursTask, setLoggingHoursTask } = useUI();
  const { tasks, projects, completeTaskWithHours, updateTask, tasksWithStatus } = useData();
  const [hours, setHours] = useState('');

  if (!loggingHoursTask) return null;

  const task = tasks.find(t => t.id === loggingHoursTask);
  if (!task) return null;
  const project = projects.find(p => p.id === task.projectId);

  const close = () => { setLoggingHoursTask(null); setHours(''); };

  const advanceNext = () => {
    const pTasks = tasksWithStatus.filter(t => t.projectId === task.projectId);
    const idx = pTasks.findIndex(t => t.id === loggingHoursTask);
    for (let i = idx + 1; i < pTasks.length; i++) {
      if (pTasks[i].status !== 'completed') {
        setTimeout(() => updateTask(pTasks[i].id, { status: 'next-in-line' }), 100);
        break;
      }
    }
  };

  const handleLog = () => {
    const h = parseFloat(hours);
    if (!h || h <= 0) return;
    completeTaskWithHours(loggingHoursTask, h);
    advanceNext();
    close();
  };

  const handleSkip = () => {
    // Complete without logging hours
    updateTask(loggingHoursTask, { status: 'completed', manualStatus: true });
    advanceNext();
    close();
  };

  const variance = hours && task.estimatedHours
    ? Math.round(((parseFloat(hours) - task.estimatedHours) / task.estimatedHours) * 100)
    : null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[8px] w-full max-w-md border border-stone-200">

        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100">
          <div className="flex items-center gap-3 mb-1">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <h3 className="text-lg font-light text-stone-900 font-serif tracking-tight">Task Complete</h3>
          </div>
          <p className="text-sm text-stone-400 font-mono ml-8">How many hours did this actually take?</p>
        </div>

        {/* Task info */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-100">
          <div className="text-sm font-semibold text-stone-900 truncate">{task.title}</div>
          <div className="text-xs text-stone-400 font-mono mt-0.5">{project?.name}</div>
          {task.estimatedHours && (
            <div className="text-xs text-indigo-600 font-mono font-medium mt-1">
              Estimated: {task.estimatedHours}h
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Actual Hours Worked
            </label>
            <input
              type="number"
              value={hours}
              onChange={e => setHours(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && hours && parseFloat(hours) > 0 && handleLog()}
              placeholder="e.g., 8.5"
              step="0.5"
              min="0"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Variance preview */}
          {variance !== null && (
            <div className={`px-3 py-2 rounded-[5px] text-xs font-mono font-medium ${
              Math.abs(variance) <= 10
                ? 'bg-green-50 text-green-700 border border-green-200'
                : variance > 0
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}>
              {variance > 0 ? `+${variance}%` : `${variance}%`} vs estimate
              {Math.abs(variance) <= 10 && ' · Great accuracy!'}
              {variance > 30 && ' · Needs review'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50/60 rounded-b-[8px]">
          <button
            onClick={handleLog}
            disabled={!hours || parseFloat(hours) <= 0}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Log {hours || '0'}h & Complete
          </button>
          <button
            onClick={handleSkip}
            className="px-5 py-2.5 border border-stone-200 rounded-[5px] text-sm font-medium text-stone-500 hover:bg-stone-100 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={close}
            className="px-5 py-2.5 border border-stone-200 rounded-[5px] text-sm font-medium text-stone-500 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
