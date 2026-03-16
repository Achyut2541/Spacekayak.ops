import { Check, ChevronDown, Circle, Users } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { fmt, daysUntil, workingHoursUntil } from '../../lib/utils';
import { TASK_STATUSES, PRIORITIES } from '../../data/constants';

export default function CapacityView() {
  const {
    capacityFilter, setCapacityFilter,
    weekView, setWeekView,
    expandedMember, setExpandedMember,
    reassigningTask, setReassigningTask,
    setWorkloadWarning,
  } = useUI();
  const {
    projects, getWorkload, capacityPct, capacityLabel,
    updateTask, getRawStatus, checkWorkloadWarning,
  } = useData();

  const workload = getWorkload().sort((a, b) => capacityPct(b) - capacityPct(a));
  const overloadedList  = workload.filter(m => capacityPct(m) >= 100);
  const atCapacityList  = workload.filter(m => capacityPct(m) >= 80 && capacityPct(m) < 100);
  const hasHeadroomList = workload.filter(m => capacityPct(m) > 0 && capacityPct(m) < 50);
  const availableList   = workload.filter(m => capacityPct(m) === 0);

  const filterGroups = [
    { key: 'all',        label: 'All',          count: workload.length,       active: 'bg-gray-800 text-white',    inactive: 'bg-white text-gray-700 border border-gray-300',    color: 'text-gray-700' },
    { key: 'overloaded', label: 'Overloaded',   count: overloadedList.length,  active: 'bg-red-600 text-white',     inactive: 'bg-white text-red-600 border border-red-300',      color: 'text-red-600' },
    { key: 'at-capacity',label: 'At Capacity',  count: atCapacityList.length,  active: 'bg-orange-500 text-white',  inactive: 'bg-white text-orange-600 border border-orange-300',color: 'text-orange-600' },
    { key: 'headroom',   label: 'Has Headroom', count: hasHeadroomList.length, active: 'bg-yellow-500 text-white',  inactive: 'bg-white text-yellow-700 border border-yellow-300',color: 'text-yellow-600' },
    { key: 'available',  label: 'Available',    count: availableList.length,   active: 'bg-green-600 text-white',   inactive: 'bg-white text-green-600 border border-green-300',  color: 'text-green-600' },
  ];

  const visibleMembers = capacityFilter === 'all' ? workload
    : capacityFilter === 'overloaded'  ? overloadedList
    : capacityFilter === 'at-capacity' ? atCapacityList
    : capacityFilter === 'headroom'    ? hasHeadroomList
    : availableList;

  const typeBadge = type => ({
    internal: 'bg-indigo-100 text-indigo-700',
    extended: 'bg-purple-100 text-purple-700',
    am:       'bg-teal-100 text-teal-700',
  }[type] || 'bg-gray-100 text-gray-600');

  const membersWithHeadroom = workload.filter(m => capacityPct(m) < 80);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light text-gray-900 font-serif tracking-tight">Team Capacity</h2>
        <div className="flex items-center justify-between mt-1">
          <p className="text-gray-500 text-sm">
            Click a tab to filter · Click a person to see their tasks · Reassign tasks to free up bottlenecks
          </p>
          <div className="flex gap-2">
            {['this-week', 'next-week'].map(wv => (
              <button key={wv} onClick={() => setWeekView(wv)}
                className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${weekView === wv ? 'bg-teal-600 text-white' : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-teal-400'}`}>
                {wv === 'this-week' ? 'This Week' : 'Next Week'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-3">
        {filterGroups.map(fg => (
          <button key={fg.key} onClick={() => setCapacityFilter(fg.key)}
            className={`px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${capacityFilter === fg.key ? fg.active : fg.inactive}`}>
            <span className={`text-2xl font-black block ${capacityFilter === fg.key ? 'text-white' : fg.color}`}>{fg.count}</span>
            {fg.label}
          </button>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-xl shadow-sm p-4 text-sm text-gray-600">
        <span className="font-bold text-gray-800">How capacity is calculated: </span>
        Higher of (projects / role max) or (weighted task load / role max).
        Weights: Critical = 2.0 · High = 1.5 · Medium = 1.0 · Low = 0.5.
        Internal max 2 projects · Extended max 1 · AMs max 3.
      </div>

      {/* Member cards */}
      {visibleMembers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3" />
          <div className="font-bold">No team members in this group right now</div>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleMembers.map(m => {
            const pct        = capacityPct(m);
            const cl         = capacityLabel(pct);
            const barColor   = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : pct >= 50 ? 'bg-yellow-500' : pct > 0 ? 'bg-green-500' : 'bg-gray-300';
            const projectPct = m.maxProjects > 0 ? Math.round((m.projectCount / m.maxProjects) * 100) : 0;
            const taskLoadPct = m.activeTasks === 0 ? 0 : Math.min(100, Math.round((m.activeTasks / 8) * 100));
            const activeTasks = weekView === 'this-week'
              ? m.thisWeekTasks.filter(t => t.status !== 'completed')
              : weekView === 'next-week'
                ? m.nextWeekTasks.filter(t => t.status !== 'completed')
                : m.taskList.filter(t => t.status !== 'completed');
            const isExpanded  = expandedMember === m.name;

            return (
              <div key={m.name} className={`bg-white rounded-xl border-2 transition-all ${pct >= 100 ? 'border-red-300' : pct >= 80 ? 'border-orange-200' : isExpanded ? 'border-teal-400' : 'border-gray-200'}`}>
                {/* Clickable header */}
                <button className="w-full text-left p-5" onClick={() => setExpandedMember(isExpanded ? null : m.name)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-bold">{m.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${typeBadge(m.type)}`}>{m.role}</span>
                      {m.delayedTasks > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">{m.delayedTasks} delayed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${cl.color}`}>{cl.label} · {pct}%</span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Main bar */}
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div className={`h-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>

                  {/* Sub-bars */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                        <span>Projects</span>
                        <span className={projectPct >= 100 ? 'text-red-600' : ''}>{m.projectCount} / {m.maxProjects}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${projectPct >= 100 ? 'bg-red-500' : projectPct >= 80 ? 'bg-orange-500' : 'bg-indigo-400'}`}
                          style={{ width: `${Math.min(projectPct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                        <span>Task load</span>
                        <span className={taskLoadPct >= 100 ? 'text-red-600' : ''}>{m.activeTasks} active</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${taskLoadPct >= 100 ? 'bg-red-500' : taskLoadPct >= 80 ? 'bg-orange-500' : 'bg-purple-400'}`}
                          style={{ width: `${Math.min(taskLoadPct, 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Project chips */}
                  {m.projects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {m.projects.map(p => (
                        <span key={p} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">{p}</span>
                      ))}
                    </div>
                  )}
                  {m.projectCount === 0 && m.activeTasks === 0 && (
                    <div className="mt-3 text-sm text-green-600 font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Available for new work
                    </div>
                  )}
                  {!isExpanded && activeTasks.length > 0 && (
                    <div className="mt-3 text-xs text-teal-600 font-semibold">
                      {activeTasks.length} active task{activeTasks.length > 1 ? 's' : ''} — click to manage
                    </div>
                  )}
                </button>

                {/* Expanded task list */}
                {isExpanded && (
                  <div className="border-t-2 border-gray-100 px-5 pb-5">
                    {/* Next deadline countdown */}
                    {activeTasks.length > 0 && (() => {
                      const sorted = [...activeTasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                      const nextTask = sorted[0];
                      const workHours = workingHoursUntil(nextTask.dueDate);
                      const workDays = Math.floor(workHours / 8);
                      const urgencyColor = workHours < 8 ? 'bg-red-50 border-red-300 text-red-800'
                        : workHours <= 24 ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                        : 'bg-green-50 border-green-300 text-green-800';
                      const urgencyIcon = workHours < 8 ? '\u{1F6A8}' : workHours <= 24 ? '\u26A1' : '\u2713';
                      return (
                        <div className={`border-2 rounded-xl p-4 mb-4 mt-4 ${urgencyColor}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{urgencyIcon}</span>
                              <span className="font-bold text-sm uppercase tracking-wider">Next Deadline</span>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black">{workHours}h</div>
                              <div className="text-xs font-semibold opacity-75">
                                {workDays > 0 && `(~${workDays} work day${workDays > 1 ? 's' : ''})`}
                                {workDays === 0 && workHours > 0 && `(today)`}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold truncate">{nextTask.title}</div>
                          <div className="text-xs font-semibold opacity-75 mt-1">
                            {projects.find(p => p.id === nextTask.projectId)?.name} · Due {fmt(nextTask.dueDate)}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between py-4">
                      <h4 className="font-bold text-gray-800">
                        {activeTasks.length > 0 ? (
                          <span>
                            {activeTasks.length} Active Task{activeTasks.length > 1 ? 's' : ''}
                            {activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) > 0 && (
                              <span className="ml-2 text-sm font-semibold text-teal-600">
                                ({activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)}h estimated)
                              </span>
                            )}
                          </span>
                        ) : 'No active tasks'}
                      </h4>
                      {membersWithHeadroom.filter(x => x.name !== m.name).length > 0 && activeTasks.length > 0 && (
                        <div className="text-xs text-gray-500 font-semibold">
                          Reassign to: {membersWithHeadroom.filter(x => x.name !== m.name).map(x => x.name).join(', ')}
                        </div>
                      )}
                    </div>

                    {activeTasks.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <Check className="w-8 h-8 mx-auto mb-2" />
                        <div className="font-semibold">All tasks completed</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeTasks.map(t => {
                          const proj = projects.find(p => p.id === t.projectId);
                          const si   = TASK_STATUSES.find(s => s.value === getRawStatus(t.id));
                          const pi   = PRIORITIES.find(p => p.value === t.priority);
                          const du   = daysUntil(t.dueDate);
                          const isReassigning = reassigningTask === t.id;

                          return (
                            <div key={t.id} className={`rounded-xl border-2 transition-all ${t.status === 'delayed' ? 'border-red-200 bg-red-50' : isReassigning ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}>
                              <div className="flex items-start p-3 gap-3">
                                <button onClick={() => updateTask(t.id, { status: 'completed' })}
                                  className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform" title="Mark complete">
                                  <Circle className="w-5 h-5 text-gray-400 hover:text-green-600 transition-colors" />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900 text-sm">{t.title}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${pi?.color}`}>{t.priority.toUpperCase()}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Users className="w-3 h-3 text-gray-400" />
                                    <div className="flex items-center gap-1.5">
                                      {(Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]).map((person, idx, arr) => (
                                        <span key={person}>
                                          <span className="text-xs text-gray-600 font-medium">{person}</span>
                                          {idx < arr.length - 1 && <span className="text-gray-400 mx-1">•</span>}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                    <span className="font-semibold text-teal-700">{proj?.name}</span>
                                    <span>Due {fmt(t.dueDate)}</span>
                                    {du === 0 && <span className="text-orange-600 font-bold">Today!</span>}
                                    {du > 0 && du <= 3 && <span className="text-yellow-600 font-bold">in {du}d</span>}
                                    {t.daysDelayed > 0 && <span className="text-red-600 font-bold">{t.daysDelayed}d overdue</span>}
                                    <span className={`px-2 py-0.5 rounded font-bold ${si?.color}`}>{si?.label}</span>
                                  </div>
                                </div>
                                <button onClick={() => setReassigningTask(isReassigning ? null : t.id)}
                                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isReassigning ? 'bg-teal-600 text-white' : 'bg-white border-2 border-teal-400 text-teal-700 hover:bg-teal-50'}`}>
                                  <Users className="w-3.5 h-3.5" /> Reassign
                                </button>
                              </div>

                              {/* Reassign picker */}
                              {isReassigning && (
                                <div className="px-3 pb-3">
                                  <div className="text-xs font-bold text-gray-600 mb-2">Pick someone with headroom:</div>
                                  <div className="flex flex-wrap gap-2">
                                    {membersWithHeadroom
                                      .filter(x => x.name !== m.name && x.name !== 'Freelancer')
                                      .map(x => {
                                        const xPct = capacityPct(x);
                                        const xCl  = capacityLabel(xPct);
                                        return (
                                          <button key={x.name}
                                            onClick={() => {
                                              const warning = checkWorkloadWarning(x.name);
                                              if (warning.warning || warning.suggestion) {
                                                setWorkloadWarning({ taskId: t.id, personName: x.name, warningData: warning });
                                              } else {
                                                updateTask(t.id, { assignedTo: [x.name] });
                                                setReassigningTask(null);
                                              }
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-teal-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all">
                                            <div>
                                              <div className="text-sm font-bold text-gray-800">{x.name}</div>
                                              <div className={`text-xs font-semibold ${xCl.color.split(' ')[1]}`}>{xCl.label} · {xPct}%</div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                  </div>
                                  {membersWithHeadroom.filter(x => x.name !== m.name && x.name !== 'Freelancer').length === 0 && (
                                    <div className="text-sm text-gray-500 italic">Everyone else is also at capacity.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
