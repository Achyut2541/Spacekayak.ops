import { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, Circle, List, Users, Calendar } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { fmt, daysUntil } from '../../lib/utils';
import { TASK_STATUSES, PRIORITIES, EMPTY_TASK } from '../../data/constants';

export default function TasksView() {
  const {
    selectedProject, setSelectedProject, setActiveTab,
    taskFilter, setTaskFilter, editingTask, setEditingTask,
    showAddTask, setShowAddTask, setClientDelayTask, setLoggingHoursTask,
    showToast, searchQuery,
  } = useUI();
  const {
    projects, tasks, tasksWithStatus, filteredTasks, getRawStatus,
    allTeamNames, assessTaskRisk, updateTask, deleteTask, addTask, canEditProjects, canViewAllProjects,
  } = useData();
  const { currentUser } = useAuth();
  const canEdit = canEditProjects(currentUser);
  const isManager = canViewAllProjects(currentUser);

  const [newTask, setNewTask] = useState({ ...EMPTY_TASK });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const currentProject = selectedProject ? projects.find(p => p.id === selectedProject) : null;
  // Team members only see their own tasks; managers see everything
  let list = filteredTasks(selectedProject, taskFilter, editingTask);
  if (!isManager) {
    list = list.filter(t => {
      const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      return a.includes(currentUser);
    });
  }
  // Apply global search query across title, project name, assignees
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(t => {
      const proj = projects.find(p => p.id === t.projectId);
      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo || ''];
      return (
        t.title.toLowerCase().includes(q) ||
        proj?.name.toLowerCase().includes(q) ||
        assignees.some(a => (a || '').toLowerCase().includes(q))
      );
    });
  }

  const delayed = list.filter(t => t.status === 'delayed');

  const handleAddTask = () => {
    addTask(newTask);
    setShowAddTask(false);
    showToast(`"${newTask.title}" added`);
    setNewTask({ ...EMPTY_TASK });
  };

  const handleDeleteTask = (id) => {
    const title = tasks.find(t => t.id === id)?.title;
    deleteTask(id);
    setConfirmDeleteId(null);
    showToast(`"${title}" deleted`, 'info');
  };

  const fmtAssignees = (assignedTo) => {
    if (Array.isArray(assignedTo)) return assignedTo.join(', ');
    return assignedTo || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-light text-stone-900 font-serif tracking-tight">
            {currentProject ? `${currentProject.name} — Tasks` : 'All Tasks'}
          </h2>
          {currentProject && (
            <button onClick={() => { setSelectedProject(null); setTaskFilter('all'); setActiveTab('projects'); }}
              className="text-indigo-500 hover:text-indigo-600 font-medium text-sm mt-1 transition-colors">
              ← Back to Projects
            </button>
          )}
        </div>
        {canEdit && (
          <button onClick={() => setShowAddTask(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 flex items-center transition-opacity">
            <Plus className="w-4 h-4 mr-2" /> New Task
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-stone-100 border border-stone-200 rounded-[6px] p-3 flex flex-wrap gap-2">
        <button onClick={() => setTaskFilter('all')}
          className={`px-3 py-1.5 rounded-[5px] text-xs font-mono font-medium transition-colors ${taskFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
          All ({list.length})
        </button>
        {TASK_STATUSES.map(s => {
          const cnt = tasksWithStatus.filter(t => t.status === s.value && (!selectedProject || t.projectId === selectedProject)).length;
          return (
            <button key={s.value} onClick={() => setTaskFilter(s.value)}
              className={`px-3 py-1.5 rounded-[5px] text-xs font-mono font-medium border transition-colors ${taskFilter === s.value ? 'bg-indigo-600 text-white border-indigo-600' : `${s.color} border-current/20 hover:opacity-80`}`}>
              {s.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Delayed alert */}
      {delayed.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[6px] p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-red-900 text-sm">{delayed.length} task{delayed.length > 1 ? 's' : ''} overdue — needs immediate attention</div>
            <div className="text-xs text-red-600 mt-0.5 font-mono">{delayed.map(t => t.title).join(' · ')}</div>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="bg-stone-50 border border-stone-200 rounded-[6px] p-12 text-center text-stone-400">
            <List className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="font-medium text-sm text-stone-500">
              {taskFilter === 'all' ? 'No tasks yet' : `No ${TASK_STATUSES.find(s => s.value === taskFilter)?.label?.toLowerCase() || taskFilter} tasks`}
            </div>
            {taskFilter !== 'all' && (
              <button onClick={() => setTaskFilter('all')} className="mt-2 text-xs text-indigo-500 hover:text-indigo-600 font-mono transition-colors">
                Show all tasks →
              </button>
            )}
          </div>
        ) : list.map(task => {
          const project = projects.find(p => p.id === task.projectId);
          const statusInfo = TASK_STATUSES.find(s => s.value === task.status);
          const priorityInfo = PRIORITIES.find(p => p.value === task.priority);
          const du = daysUntil(task.dueDate);
          const isConfirmingDelete = confirmDeleteId === task.id;

          return (
            <div key={task.id}
              className={`bg-white rounded-[6px] p-4 border transition-all ${
                isConfirmingDelete ? 'border-red-300 bg-red-50/40' :
                task.status === 'delayed' ? 'border-red-200 bg-red-50/40' : 'border-stone-200 hover:border-indigo-200'
              }`}>
              {/* Delete confirmation inline banner */}
              {isConfirmingDelete && (
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-red-200">
                  <span className="text-sm font-medium text-red-700">
                    Delete <span className="font-bold">{task.title}</span>?
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteTask(task.id)}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-mono font-medium rounded-[5px] hover:opacity-85 transition-opacity">
                      Delete
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 border border-stone-200 text-stone-600 text-xs font-medium rounded-[5px] hover:bg-stone-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1 min-w-0">
                  <button className="mr-3 mt-0.5 flex-shrink-0"
                    onClick={() => {
                      if (task.status === 'completed') {
                        updateTask(task.id, { status: 'in-progress' });
                      } else {
                        const result = updateTask(task.id, { status: 'completed' });
                        if (result?.needsHoursLog) setLoggingHoursTask(task.id);
                      }
                    }}>
                    {task.status === 'completed'
                      ? <CheckCircle className="w-5 h-5 text-green-500" />
                      : <Circle className="w-5 h-5 text-stone-300 hover:text-indigo-500 transition-colors" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-medium text-stone-900 text-sm ${task.status === 'completed' ? 'line-through text-stone-400' : ''}`}>
                        {task.title}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-mono font-medium ${priorityInfo?.color}`}>
                        {task.priority?.toUpperCase()}
                      </span>
                      {!selectedProject && project && (
                        <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-[5px]">{project.name}</span>
                      )}
                      {(() => {
                        const risk = assessTaskRisk(task);
                        if (risk.riskLevel !== 'none') {
                          const riskColors = {
                            'critical': 'bg-red-100 text-red-700',
                            'high': 'bg-orange-100 text-orange-700',
                            'medium': 'bg-yellow-100 text-yellow-700',
                            'low': 'bg-indigo-100 text-indigo-700',
                          };
                          return (
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-mono font-medium ${riskColors[risk.riskLevel]}`} title={risk.reasons.join(', ')}>
                              {risk.riskLevel.toUpperCase()} RISK
                            </span>
                          );
                        }
                      })()}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-stone-500 font-mono flex-wrap">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{fmtAssignees(task.assignedTo)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{fmt(task.dueDate)}
                        {du === 0 && <span className="text-orange-600 font-medium">· Today!</span>}
                        {du === 1 && <span className="text-orange-600 font-medium">· Tomorrow</span>}
                        {du > 1 && du <= 3 && <span className="text-yellow-600 font-medium">· {du}d</span>}
                      </span>
                      {task.daysDelayed > 0 && (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <AlertTriangle className="w-3 h-3" />{task.daysDelayed}d overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <select
                    value={getRawStatus(task.id)}
                    onChange={e => {
                      e.stopPropagation();
                      const result = updateTask(task.id, { status: e.target.value });
                      if (result?.needsHoursLog) setLoggingHoursTask(task.id);
                      if (result?.needsDelayLog) setClientDelayTask(task.id);
                    }}
                    className={`px-2 py-1.5 rounded-[5px] text-xs font-mono font-medium border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 ${TASK_STATUSES.find(s => s.value === getRawStatus(task.id))?.color || statusInfo?.color}`}
                  >
                    {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {canEdit && (
                    <>
                      <button onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                        className="p-1.5 hover:bg-stone-100 rounded-[5px] transition-colors"><Edit2 className="w-4 h-4 text-stone-400" /></button>
                      <button onClick={() => setConfirmDeleteId(confirmDeleteId === task.id ? null : task.id)}
                        className="p-1.5 hover:bg-red-50 rounded-[5px] transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </>
                  )}
                </div>
              </div>

              {/* Quick edit */}
              {canEdit && editingTask === task.id && (
                <div className="mt-3 pt-3 border-t border-stone-200 grid grid-cols-3 gap-3">
                  <div>
                    <div className="gravity-label mb-1">Assigned To</div>
                    <select value={Array.isArray(task.assignedTo) ? task.assignedTo[0] || '' : task.assignedTo}
                      onChange={e => updateTask(task.id, { assignedTo: [e.target.value] })}
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-[5px] text-sm focus:border-indigo-500 focus:outline-none">
                      {allTeamNames.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="gravity-label mb-1">Due Date</div>
                    <input type="date" value={task.dueDate} onChange={e => updateTask(task.id, { dueDate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-[5px] text-sm focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <div className="gravity-label mb-1">Priority</div>
                    <select value={task.priority} onChange={e => updateTask(task.id, { priority: e.target.value })}
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-[5px] text-sm focus:border-indigo-500 focus:outline-none">
                      {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add Task Modal ── */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[8px] w-full max-w-lg max-h-[90vh] flex flex-col border border-stone-200">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-shrink-0">
              <h3 className="text-lg font-light text-stone-900 font-serif tracking-tight">New Task</h3>
              <button onClick={() => { setShowAddTask(false); setNewTask({ ...EMPTY_TASK }); }}
                className="p-1.5 hover:bg-stone-100 rounded-[5px] transition-colors">
                <Plus className="w-4 h-4 text-stone-500 rotate-45" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

              {/* Project */}
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Project *</label>
                <select value={newTask.projectId || ''} onChange={e => setNewTask({ ...newTask, projectId: e.target.value, dependsOn: [] })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none bg-white">
                  <option value="">Select project…</option>
                  {projects.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Task Title *</label>
                <input
                  type="text" value={newTask.title || ''} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && newTask.projectId && newTask.title?.trim() && newTask.assignedTo?.length && newTask.dueDate && handleAddTask()}
                  placeholder="e.g., Design homepage hero section"
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none transition-colors placeholder-stone-300"
                />
              </div>

              {/* Assignees — pill-based */}
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Assigned To *</label>
                {(newTask.assignedTo || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(newTask.assignedTo || []).map(person => (
                      <span key={person} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                        {person}
                        <button onClick={() => setNewTask({ ...newTask, assignedTo: newTask.assignedTo.filter(p => p !== person) })}
                          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="border border-stone-200 rounded-[6px] overflow-hidden max-h-[120px] overflow-y-auto">
                  {allTeamNames.filter(m => !(newTask.assignedTo || []).includes(m)).map(member => (
                    <button key={member}
                      onClick={() => setNewTask({ ...newTask, assignedTo: [...(newTask.assignedTo || []), member] })}
                      className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-indigo-50 transition-colors border-b border-stone-100 last:border-0 font-medium">
                      {member}
                    </button>
                  ))}
                  {allTeamNames.filter(m => !(newTask.assignedTo || []).includes(m)).length === 0 && (
                    <div className="px-3 py-3 text-xs text-stone-400 text-center font-mono">All team members assigned</div>
                  )}
                </div>
              </div>

              {/* Due date + Est. hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Due Date *</label>
                  <input type="date" value={newTask.dueDate || ''} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Est. Hours</label>
                  <input type="number" value={newTask.estimatedHours || ''} step="0.5" min="0"
                    onChange={e => setNewTask({ ...newTask, estimatedHours: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 8"
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>

              {/* Status + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Status</label>
                  <div className="grid grid-cols-1 gap-1">
                    {TASK_STATUSES.filter(s => s.value !== 'delayed').map(s => (
                      <button key={s.value} onClick={() => setNewTask({ ...newTask, status: s.value })}
                        className={`w-full text-left px-3 py-1.5 text-xs font-mono font-medium rounded-[5px] transition-colors border ${
                          newTask.status === s.value
                            ? `${s.color} border-current`
                            : 'text-stone-500 border-stone-200 hover:bg-stone-50'
                        }`}>
                        {newTask.status === s.value ? '● ' : '○ '}{s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Priority</label>
                  <div className="grid grid-cols-1 gap-1">
                    {PRIORITIES.map(p => (
                      <button key={p.value} onClick={() => setNewTask({ ...newTask, priority: p.value })}
                        className={`w-full text-left px-3 py-1.5 text-xs font-mono font-medium rounded-[5px] transition-colors border ${
                          newTask.priority === p.value
                            ? `${p.color} border-current`
                            : 'text-stone-500 border-stone-200 hover:bg-stone-50'
                        }`}>
                        {newTask.priority === p.value ? '● ' : '○ '}{p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dependencies */}
              {newTask.projectId && tasks.filter(t => t.projectId === newTask.projectId && t.status !== 'completed').length > 0 && (
                <div>
                  <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                    Blocked by <span className="text-stone-400 normal-case font-normal">(can't start until these complete)</span>
                  </label>
                  <div className="border border-stone-200 rounded-[6px] overflow-hidden max-h-[100px] overflow-y-auto">
                    {tasks
                      .filter(t => t.projectId === newTask.projectId && t.status !== 'completed')
                      .map(t => {
                        const checked = (newTask.dependsOn || []).includes(t.id);
                        return (
                          <button key={t.id}
                            onClick={() => {
                              const deps = newTask.dependsOn || [];
                              setNewTask({ ...newTask, dependsOn: checked ? deps.filter(id => id !== t.id) : [...deps, t.id] });
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 transition-colors border-b border-stone-100 last:border-0 ${checked ? 'bg-amber-50' : 'hover:bg-stone-50'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${checked ? 'bg-amber-500 border-amber-500' : 'border-stone-300'}`}>
                              {checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                            </div>
                            <span className={`flex-1 truncate ${checked ? 'font-medium text-amber-800' : 'text-stone-600'}`}>{t.title}</span>
                            <span className="text-stone-400 flex-shrink-0 font-mono">{t.status}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50/60 rounded-b-[8px] flex-shrink-0">
              <button onClick={handleAddTask}
                disabled={!newTask.projectId || !newTask.title?.trim() || !(newTask.assignedTo?.length) || !newTask.dueDate}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                Create Task
              </button>
              <button onClick={() => { setShowAddTask(false); setNewTask({ ...EMPTY_TASK }); }}
                className="px-6 py-2.5 border border-stone-200 rounded-[5px] text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
