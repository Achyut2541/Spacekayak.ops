import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { fmt } from '../../lib/utils';

export default function RiskView() {
  const {
    projects, tasksWithStatus, assessTaskRisk, canStartTask,
    suggestReassignment, updateTask, getWorkload, historicalData, canEditProjects,
  } = useData();
  const { currentUser } = useAuth();
  const canEdit = canEditProjects(currentUser);
  const [confirmReassign, setConfirmReassign] = useState(null); // { taskId, name }

  const activeTasks = tasksWithStatus.filter(t => t.status !== 'completed');
  const tasksWithRisk = activeTasks.map(task => ({
    ...task,
    risk: assessTaskRisk(task),
    dependency: canStartTask(task),
    reassignment: task.assignedTo && task.assignedTo.length > 0 ? suggestReassignment(task.id) : null,
  }));

  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
  const highRiskTasks = tasksWithRisk
    .filter(t => t.risk.riskLevel !== 'none')
    .sort((a, b) => riskOrder[a.risk.riskLevel] - riskOrder[b.risk.riskLevel]);

  const overloadedPeople = getWorkload().filter(w => w.activeTasks >= 6);
  const blockedTasks = tasksWithRisk.filter(t => !t.dependency.canStart);

  const riskColors = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light text-stone-900 font-serif tracking-tight">Risk & Resource Management</h2>
        <p className="text-stone-400 mt-1 text-sm font-mono">Predictive insights, dependency tracking, and resource optimization</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-[6px] p-4">
          <div className="text-red-600 text-[1.9rem] font-light font-serif">
            {highRiskTasks.filter(t => t.risk.riskLevel === 'critical' || t.risk.riskLevel === 'high').length}
          </div>
          <div className="text-red-700 font-mono text-xs uppercase tracking-wider mt-1">High Risk Tasks</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-[6px] p-4">
          <div className="text-orange-600 text-[1.9rem] font-light font-serif">{blockedTasks.length}</div>
          <div className="text-orange-700 font-mono text-xs uppercase tracking-wider mt-1">Blocked Tasks</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-[6px] p-4">
          <div className="text-yellow-600 text-[1.9rem] font-light font-serif">{overloadedPeople.length}</div>
          <div className="text-yellow-700 font-mono text-xs uppercase tracking-wider mt-1">Overloaded Members</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-[6px] p-4">
          <div className="text-indigo-600 text-[1.9rem] font-light font-serif">{Object.keys(historicalData.teamVelocity).length}</div>
          <div className="text-indigo-700 font-mono text-xs uppercase tracking-wider mt-1">Members Tracked</div>
        </div>
      </div>

      {/* High Risk Tasks */}
      {highRiskTasks.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-[6px] p-6">
          <h3 className="text-base font-medium text-stone-900 font-serif mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            At-Risk Tasks
          </h3>
          <div className="space-y-2">
            {highRiskTasks.slice(0, 10).map(task => {
              const project = projects.find(p => p.id === task.projectId);
              return (
                <div key={task.id} className="rounded-[5px] p-4 border border-stone-100 bg-stone-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${riskColors[task.risk.riskLevel]}`}>
                          {task.risk.riskLevel.toUpperCase()} RISK
                        </span>
                        <span className="text-sm font-medium text-stone-900">{task.title}</span>
                      </div>
                      <div className="text-xs text-stone-400 font-mono mb-2">
                        {project?.name} · Due {fmt(task.dueDate)}
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {task.risk.reasons.map((reason, idx) => (
                          <span key={idx} className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-[5px] font-mono">{reason}</span>
                        ))}
                      </div>

                      {canEdit && task.reassignment && task.reassignment.suggestions.length > 0 && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-[5px] p-3">
                          <div className="text-xs font-mono font-medium text-green-700 mb-2">Reassignment suggestions:</div>
                          {confirmReassign?.taskId === task.id && (
                            <div className="flex items-center justify-between mb-2 p-2 bg-white border border-green-300 rounded-[5px]">
                              <span className="text-xs font-medium text-stone-700">Reassign to <span className="font-bold text-green-800">{confirmReassign.name}</span>?</span>
                              <div className="flex gap-1.5">
                                <button onClick={() => { updateTask(task.id, { assignedTo: [confirmReassign.name] }); setConfirmReassign(null); }}
                                  className="px-2.5 py-1 bg-green-600 text-white text-xs font-mono font-medium rounded-[5px] hover:opacity-85 transition-opacity">
                                  Confirm
                                </button>
                                <button onClick={() => setConfirmReassign(null)}
                                  className="px-2.5 py-1 border border-stone-200 text-stone-500 text-xs font-medium rounded-[5px] hover:bg-stone-50 transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            {task.reassignment.suggestions.slice(0, 3).map((sug, idx) => (
                              <button
                                key={idx}
                                onClick={() => setConfirmReassign({ taskId: task.id, name: sug.name })}
                                className={`text-xs bg-white border px-3 py-1.5 rounded-[5px] transition-colors ${confirmReassign?.taskId === task.id && confirmReassign?.name === sug.name ? 'border-green-500 ring-1 ring-green-400' : 'border-green-200 hover:bg-green-50'}`}
                              >
                                <div className="font-medium text-green-900">{sug.name}</div>
                                <div className="text-green-600 font-mono">{sug.currentTasks} tasks · {sug.capacity}%</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dependency Map */}
      {blockedTasks.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-[6px] p-6">
          <h3 className="text-base font-medium text-stone-900 font-serif mb-4">Blocked Tasks</h3>
          <div className="space-y-2">
            {blockedTasks.slice(0, 10).map(task => (
              <div key={task.id} className="border border-orange-100 bg-orange-50/60 rounded-[5px] p-4">
                <div className="font-medium text-stone-800 text-sm mb-1">{task.title}</div>
                <div className="text-xs text-orange-600 font-mono">
                  Blocked by: {task.dependency.blockedBy.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Learning Insights */}
      {Object.keys(historicalData.teamVelocity).length > 0 && (
        <div className="bg-white border border-stone-200 rounded-[6px] p-6">
          <h3 className="text-base font-medium text-stone-900 font-serif mb-4">Team Performance Insights</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(historicalData.teamVelocity).slice(0, 9).map(([name, data]) => (
              <div key={name} className="rounded-[5px] p-3 bg-stone-50 border border-stone-100">
                <div className="font-medium text-stone-800 text-sm">{name}</div>
                <div className="text-xs text-stone-500 font-mono mt-1">{data.tasksCompleted} tasks completed</div>
                <div className="text-xs text-stone-500 font-mono">{Math.round(data.avgAccuracy)}% estimate accuracy</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
