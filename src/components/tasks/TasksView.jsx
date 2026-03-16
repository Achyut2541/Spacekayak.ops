import { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, Circle, List, Users, Calendar } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { fmt, daysUntil } from '../../lib/utils';
import { TASK_STATUSES, PRIORITIES, EMPTY_TASK } from '../../data/constants';

export default function TasksView() {
  const {
    selectedProject, setSelectedProject, setActiveTab,
    taskFilter, setTaskFilter, editingTask, setEditingTask,
    showAddTask, setShowAddTask,
  } = useUI();
  const {
    projects, tasks, tasksWithStatus, filteredTasks, getRawStatus,
    allTeamNames, assessTaskRisk, updateTask, deleteTask, addTask,
  } = useData();

  const [newTask, setNewTask] = useState({ ...EMPTY_TASK });

  const currentProject = selectedProject ? projects.find(p => p.id === selectedProject) : null;
  const list = filteredTasks(selectedProject, taskFilter, editingTask);
  const delayed = list.filter(t => t.status === 'delayed');

  const handleAddTask = () => {
    addTask(newTask);
    setShowAddTask(false);
    setNewTask({ ...EMPTY_TASK });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-light text-gray-900 font-serif tracking-tight">
            {currentProject ? `${currentProject.name} — Tasks` : 'All Tasks'}
          </h2>
          {currentProject && (
            <button onClick={() => { setSelectedProject(null); setTaskFilter('all'); setActiveTab('projects'); }}
              className="text-teal-600 hover:text-teal-700 font-semibold text-sm mt-1">
              ← Back to Projects
            </button>
          )}
        </div>
        <button onClick={() => setShowAddTask(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-[5px] font-mono font-medium uppercase tracking-wider hover:opacity-85 flex items-center shadow-md">
          <Plus className="w-4 h-4 mr-2" /> New Task
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-stone-100 border border-stone-200 rounded-[6px] p-4 flex flex-wrap gap-2">
        <button onClick={() => setTaskFilter('all')}
          className={`px-4 py-1.5 rounded-lg font-bold text-sm ${taskFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          All ({list.length})
        </button>
        {TASK_STATUSES.map(s => {
          const cnt = tasksWithStatus.filter(t => t.status === s.value && (!selectedProject || t.projectId === selectedProject)).length;
          return (
            <button key={s.value} onClick={() => setTaskFilter(s.value)}
              className={`px-4 py-1.5 rounded-lg font-bold text-sm border-2 ${taskFilter === s.value ? 'bg-teal-600 text-white border-teal-600' : s.color}`}>
              {s.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Delayed alert */}
      {delayed.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
          <div>
            <div className="font-bold text-red-900">{delayed.length} task{delayed.length > 1 ? 's' : ''} overdue — needs immediate attention</div>
            <div className="text-sm text-red-700 mt-0.5">{delayed.map(t => t.title).join(' · ')}</div>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-400">
            <List className="w-12 h-12 mx-auto mb-3" />
            <div className="font-bold">No tasks found</div>
          </div>
        ) : list.map(task => {
          const project = projects.find(p => p.id === task.projectId);
          const statusInfo = TASK_STATUSES.find(s => s.value === task.status);
          const priorityInfo = PRIORITIES.find(p => p.value === task.priority);
          const du = daysUntil(task.dueDate);

          return (
            <div key={task.id}
              className={`bg-white rounded-xl p-4 border-2 transition-all ${task.status === 'delayed' ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-teal-300'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1 min-w-0">
                  <button className="mr-3 mt-0.5 flex-shrink-0"
                    onClick={() => updateTask(task.id, { status: task.status === 'completed' ? 'in-progress' : 'completed' })}>
                    {task.status === 'completed'
                      ? <CheckCircle className="w-6 h-6 text-green-600" />
                      : <Circle className="w-6 h-6 text-gray-400 hover:text-teal-600 transition-colors" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-bold text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityInfo?.color}`}>
                        {task.priority.toUpperCase()}
                      </span>
                      {!selectedProject && project && (
                        <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{project.name}</span>
                      )}
                      {(() => {
                        const risk = assessTaskRisk(task);
                        if (risk.riskLevel !== 'none') {
                          const riskColors = {
                            'critical': 'bg-red-100 text-red-700 border-red-300',
                            'high': 'bg-orange-100 text-orange-700 border-orange-300',
                            'medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                            'low': 'bg-indigo-100 text-indigo-700 border-indigo-300',
                          };
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${riskColors[risk.riskLevel]}`} title={risk.reasons.join(', ')}>
                              {risk.riskLevel.toUpperCase()} RISK
                            </span>
                          );
                        }
                      })()}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" />{task.assignedTo}</span>
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />{fmt(task.dueDate)}
                        {du === 0 && <span className="ml-1 text-orange-600 font-bold">· Today!</span>}
                        {du === 1 && <span className="ml-1 text-orange-600 font-bold">· Tomorrow</span>}
                        {du > 1 && du <= 3 && <span className="ml-1 text-yellow-600 font-bold">· {du} days</span>}
                      </span>
                      {task.daysDelayed > 0 && (
                        <span className="flex items-center text-red-600 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />{task.daysDelayed}d overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <select
                    value={getRawStatus(task.id)}
                    onChange={e => { e.stopPropagation(); updateTask(task.id, { status: e.target.value }); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 ${TASK_STATUSES.find(s => s.value === getRawStatus(task.id))?.color || statusInfo?.color}`}
                  >
                    {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                  <button onClick={() => deleteTask(task.id)}
                    className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>

              {/* Quick edit */}
              {editingTask === task.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">Assigned To</div>
                    <select value={task.assignedTo} onChange={e => updateTask(task.id, { assignedTo: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-teal-500 focus:outline-none">
                      {allTeamNames.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">Due Date</div>
                    <input type="date" value={task.dueDate} onChange={e => updateTask(task.id, { dueDate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-teal-500 focus:outline-none" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">Priority</div>
                    <select value={task.priority} onChange={e => updateTask(task.id, { priority: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-teal-500 focus:outline-none">
                      {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-light font-serif tracking-tight mb-6">Add New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Project *</label>
                <select value={newTask.projectId || ''} onChange={e => setNewTask({ ...newTask, projectId: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none">
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Task Title *</label>
                <input type="text" value={newTask.title || ''} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g., Design homepage hero section"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Assigned To *</label>
                  <select multiple value={newTask.assignedTo || []}
                    onChange={e => { const selected = Array.from(e.target.selectedOptions, o => o.value); setNewTask({ ...newTask, assignedTo: selected }); }}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" size="5">
                    {allTeamNames.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">Hold Cmd/Ctrl to select multiple</div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Due Date *</label>
                  <input type="date" value={newTask.dueDate || ''} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Status</label>
                  <select value={newTask.status || 'backlog'} onChange={e => setNewTask({ ...newTask, status: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none">
                    {TASK_STATUSES.filter(s => s.value !== 'delayed').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Priority</label>
                  <select value={newTask.priority || 'medium'} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Estimated Hours</label>
                  <input type="number" value={newTask.estimatedHours || ''} step="0.5" min="0"
                    onChange={e => setNewTask({ ...newTask, estimatedHours: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 8"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Dependencies (blocks this task)</label>
                <select multiple value={newTask.dependsOn || []}
                  onChange={e => { const selected = Array.from(e.target.selectedOptions, o => o.value); setNewTask({ ...newTask, dependsOn: selected }); }}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" size="4">
                  {newTask.projectId && tasks
                    .filter(t => t.projectId === newTask.projectId && t.id !== newTask.id)
                    .map(t => <option key={t.id} value={t.id}>{t.title} ({t.status})</option>)}
                </select>
                <div className="text-xs text-gray-500 mt-1">This task can't start until selected tasks are completed</div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAddTask}
                disabled={!newTask.projectId || !newTask.title?.trim() || !newTask.assignedTo?.length || !newTask.dueDate}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-[5px] font-mono font-medium uppercase tracking-wider hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                Add Task
              </button>
              <button onClick={() => { setShowAddTask(false); setNewTask({ ...EMPTY_TASK }); }}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
