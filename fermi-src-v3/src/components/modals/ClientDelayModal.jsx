import { useState } from 'react';
import { Clock } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { fmt } from '../../lib/utils';

export default function ClientDelayModal() {
  const { clientDelayTask, setClientDelayTask } = useUI();
  const { tasks, projects, logClientDelay } = useData();
  const [days, setDays] = useState('');

  if (!clientDelayTask) return null;

  const task = tasks.find(t => t.id === clientDelayTask);
  if (!task) return null;
  const project = projects.find(p => p.id === task.projectId);

  const close = () => { setClientDelayTask(null); setDays(''); };

  const handleLog = () => {
    const d = parseInt(days);
    if (!d || d <= 0) return;
    logClientDelay(clientDelayTask, d);
    close();
  };

  // Preview new deadline
  const newDeadline = days && parseInt(days) > 0 && project
    ? (() => {
        const d = new Date(project.endDate);
        d.setDate(d.getDate() + parseInt(days));
        return d.toISOString().split('T')[0];
      })()
    : null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[8px] w-full max-w-md border border-stone-200">

        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100">
          <div className="flex items-center gap-3 mb-1">
            <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <h3 className="text-lg font-light text-stone-900 font-serif tracking-tight">Client Delay</h3>
          </div>
          <p className="text-sm text-stone-400 font-mono ml-8">How many days is the client delaying this?</p>
        </div>

        {/* Task info */}
        <div className="px-6 py-4 bg-orange-50 border-b border-orange-100">
          <div className="text-sm font-semibold text-stone-900 truncate">{task.title}</div>
          <div className="text-xs text-stone-400 font-mono mt-0.5">{project?.name}</div>
          {project && (
            <div className="text-xs text-stone-500 font-mono mt-1">
              Current deadline: <span className="font-semibold text-stone-700">{fmt(project.endDate)}</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Days Delayed by Client
            </label>
            <input
              type="number"
              value={days}
              onChange={e => setDays(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && days && parseInt(days) > 0 && handleLog()}
              placeholder="e.g., 5"
              step="1"
              min="1"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-orange-400 focus:outline-none transition-colors"
            />
          </div>

          {/* New deadline preview */}
          {newDeadline && (
            <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-[5px] text-xs font-mono">
              <span className="text-stone-500">New project deadline: </span>
              <span className="font-semibold text-indigo-700">{fmt(newDeadline)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50/60 rounded-b-[8px]">
          <button
            onClick={handleLog}
            disabled={!days || parseInt(days) <= 0}
            className="flex-1 bg-orange-500 text-white py-2.5 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Log {days || '0'} Day Delay
          </button>
          <button
            onClick={close}
            className="px-6 py-2.5 border border-stone-200 rounded-[5px] text-sm font-medium text-stone-500 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
