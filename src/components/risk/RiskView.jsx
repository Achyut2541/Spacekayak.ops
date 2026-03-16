import { AlertTriangle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { fmt } from '../../lib/utils';

export default function RiskView() {
  const {
    projects, tasksWithStatus, assessTaskRisk, canStartTask,
    suggestReassignment, updateTask, getWorkload, historicalData,
  } = useData();

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
    critical: 'bg-red-100 text-red-700 border-red-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light text-gray-900 font-serif tracking-tight">Risk & Resource Management</h2>
        <p className="text-gray-500 mt-1">Predictive insights, dependency tracking, and resource optimization</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="text-red-600 text-2xl font-black">
            {highRiskTasks.filter(t => t.risk.riskLevel === 'critical' || t.risk.riskLevel === 'high').length}
          </div>
          <div className="text-red-900 font-semibold text-sm">High Risk Tasks</div>
        </div>
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <div className="text-orange-600 text-2xl font-black">{blockedTasks.length}</div>
          <div className="text-orange-900 font-semibold text-sm">Blocked by Dependencies</div>
        </div>
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-600 text-2xl font-black">{overloadedPeople.length}</div>
          <div className="text-yellow-900 font-semibold text-sm">Overloaded Team Members</div>
        </div>
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
          <div className="text-indigo-600 text-2xl font-black">{Object.keys(historicalData.teamVelocity).length}</div>
          <div className="text-indigo-900 font-semibold text-sm">Team Members Tracked</div>
        </div>
      </div>

      {/* High Risk Tasks */}
      {highRiskTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            At-Risk Tasks
          </h3>
          <div className="space-y-3">
            {highRiskTasks.slice(0, 10).map(task => {
              const project = projects.find(p => p.id === task.projectId);
              return (
                <div key={task.id} className="rounded-lg shadow-sm p-4 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${riskColors[task.risk.riskLevel]}`}>
                          {task.risk.riskLevel.toUpperCase()} RISK
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{task.title}</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {project?.name} &bull; Due {fmt(task.dueDate)}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {task.risk.reasons.map((reason, idx) => (
                          <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded">{reason}</span>
                        ))}
                      </div>

                      {task.reassignment && task.reassignment.suggestions.length > 0 && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                          <div className="text-xs font-bold text-green-900 mb-2">Reassignment Suggestions:</div>
                          <div className="flex gap-2">
                            {task.reassignment.suggestions.slice(0, 3).map((sug, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (window.confirm(`Reassign to ${sug.name}?`)) {
                                    updateTask(task.id, { assignedTo: [sug.name] });
                                  }
                                }}
                                className="text-xs bg-white border border-green-300 px-3 py-1.5 rounded hover:bg-green-100 transition-colors"
                              >
                                <div className="font-semibold text-green-900">{sug.name}</div>
                                <div className="text-green-700">{sug.currentTasks} tasks &bull; {sug.capacity}% capacity</div>
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
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Blocked Tasks (Dependency Issues)</h3>
          <div className="space-y-3">
            {blockedTasks.slice(0, 10).map(task => (
              <div key={task.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-1">{task.title}</div>
                <div className="text-sm text-orange-700">
                  Blocked by: {task.dependency.blockedBy.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Learning Insights */}
      {Object.keys(historicalData.teamVelocity).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Team Performance Insights</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(historicalData.teamVelocity).slice(0, 9).map(([name, data]) => (
              <div key={name} className="rounded-lg p-3 bg-gray-50">
                <div className="font-semibold text-gray-900">{name}</div>
                <div className="text-sm text-gray-600 mt-1">{data.tasksCompleted} tasks completed</div>
                <div className="text-sm text-gray-600">{Math.round(data.avgAccuracy)}% estimate accuracy</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
