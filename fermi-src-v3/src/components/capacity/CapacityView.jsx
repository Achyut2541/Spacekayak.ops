import { Check, ChevronDown, Circle, Users } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { fmt, daysUntil, workingHoursUntil } from '../../lib/utils';
import { TASK_STATUSES, PRIORITIES } from '../../data/constants';

export default function CapacityView() {
  const {
    capacityFilter, setCapacityFilter,
    weekView, setWeekView,
    expandedMember, setExpandedMember,
    reassigningTask, setReassigningTask,
    setWorkloadWarning, setLoggingHoursTask,
  } = useUI();
  const {
    projects, getWorkload, capacityPct, capacityLabel,
    updateTask, getRawStatus, checkWorkloadWarning, canEditProjects,
  } = useData();
  const { currentUser } = useAuth();
  const canEdit = canEditProjects(currentUser);

  const workload = getWorkload().sort((a, b) => capacityPct(b) - capacityPct(a));
  const overloadedList  = workload.filter(m => capacityPct(m) >= 100);
  const atCapacityList  = workload.filter(m => capacityPct(m) >= 80 && capacityPct(m) < 100);
  const hasHeadroomList = workload.filter(m => capacityPct(m) > 0 && capacityPct(m) < 50);
  const availableList   = workload.filter(m => capacityPct(m) === 0);

  const filterGroups = [
    { key: 'all',         label: 'All',          count: workload.length,       active: 'bg-stone-800 text-white',   inactive: 'bg-white text-stone-700 border border-stone-200' },
    { key: 'overloaded',  label: 'Overloaded',   count: overloadedList.length,  active: 'bg-red-600 text-white',     inactive: 'bg-white text-red-600 border border-red-200' },
    { key: 'at-capacity', label: 'At Capacity',  count: atCapacityList.length,  active: 'bg-orange-500 text-white',  inactive: 'bg-white text-orange-600 border border-orange-200' },
    { key: 'headroom',    label: 'Has Headroom', count: hasHeadroomList.length, active: 'bg-yellow-500 text-white',  inactive: 'bg-white text-yellow-700 border border-yellow-200' },
    { key: 'available',   label: 'Available',    count: availableList.length,   active: 'bg-green-600 text-white',   inactive: 'bg-white text-green-600 border border-green-200' },
  ];

  const visibleMembers = capacityFilter === 'all' ? workload
    : capacityFilter === 'overloaded'  ? overloadedList
    : capacityFilter === 'at-capacity' ? atCapacityList
    : capacityFilter === 'headroom'    ? hasHeadroomList
    : availableList;

  const typeBadge = type => ({
    internal: 'bg-indigo-100 text-indigo-700',
    extended: 'bg-purple-100 text-purple-700',
    am:       'bg-amber-100 text-amber-700',
  }[type] || 'bg-stone-100 text-stone-600');

  const membersWithHeadroom = workload.filter(m => capacityPct(m) < 80);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light text-stone-900 font-serif tracking-tight">Team Capacity</h2>
        <div className="flex items-center justify-between mt-1">
          <p className="text-stone-400 text-sm font-mono">
            Click a person to see their tasks · Reassign tasks to free up bottlenecks
          </p>
          <div className="flex gap-2">
            {['this-week', 'next-week'].map(wv => (
              <button key={wv} onClick={() => setWeekView(wv)}
                className={`px-3 py-1.5 rounded-[5px] text-xs font-mono font-medium transition-colors ${weekView === wv ? 'bg-indigo-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                {wv === 'this-week' ? 'This Week' : 'Next Week'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterGroups.map(fg => (
          <button key={fg.key} onClick={() => setCapacityFilter(fg.key)}
            className={`px-4 py-2.5 rounded-[6px] text-sm font-medium transition-colors ${capacityFilter === fg.key ? fg.active : fg.inactive}`}>
            <span className="text-xl font-light block font-serif">{fg.count}</span>
            <span className="text-xs font-mono">{fg.label}</span>
          </button>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-stone-50 border border-stone-200 rounded-[6px] p-4 text-xs text-stone-500 font-mono">
        <span className="font-medium text-stone-700">Capacity: </span>
        higher of (projects / role max) or (weighted task load / role max).
        Weights: Critical = 2.0 · High = 1.5 · Medium = 1.0 · Low = 0.5
      </div>

      {/* Member cards */}
      {visibleMembers.length === 0 ? (
        <div className="bg-stone-50 border border-stone-200 rounded-[6px] p-12 text-center text-stone-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <div className="text-sm font-medium">No team members in this group right now</div>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleMembers.map(m => {
            const pct        = capacityPct(m);
            const cl         = capacityLabel(pct);
            const barColor   = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : pct >= 50 ? 'bg-yellow-500' : pct > 0 ? 'bg-green-500' : 'bg-stone-300';
            const projectPct = m.maxProjects > 0 ? Math.round((m.projectCount / m.maxProjects) * 100) : 0;
            const taskLoadPct = m.activeTasks === 0 ? 0 : Math.min(100, Math.round((m.activeTasks / 8) * 100));
            const activeTasks = weekView === 'this-week'
              ? m.thisWeekTasks.filter(t => t.status !== 'completed')
              : weekView === 'next-week'
                ? m.nextWeekTasks.filter(t => t.status !== 'completed')
                : m.taskList.filter(t => t.status !== 'completed');
            const isExpanded  = expandedMember === m.name;

            return (
              <div key={m.name} className={`bg-white rounded-[6px] border transition-all ${pct >= 100 ? 'border-red-200' : pct >= 80 ? 'border-orange-200' : isExpanded ? 'border-indigo-300' : 'border-stone-200'}`}>
                {/* Clickable header */}
                <button className="w-full text-left p-5" onClick={() => setExpandedMember(isExpanded ? null : m.name)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-medium text-stone-900">{m.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${typeBadge(m.type)}`}>{m.role}</span>
                      {m.delayedTasks > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-red-100 text-red-700">{m.delayedTasks} delayed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${cl.color}`}>{cl.label} · {pct}%</span>
                      <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Main bar */}
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-3">
                    <div className={`h-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>

                  {/* Sub-bars */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 rounded-[5px] p-3">
                      <div className="flex justify-between text-xs font-mono text-stone-500 mb-1.5">
                        <span>Projects</span>
                        <span className={projectPct >= 100 ? 'text-red-600' : ''}>{m.projectCount} / {m.maxProjects}</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className={`h-full ${projectPct >= 100 ? 'bg-red-500' : projectPct >= 80 ? 'bg-orange-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(projectPct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="bg-stone-50 rounded-[5px] p-3">
                      <div className="flex justify-between text-xs font-mono text-stone-500 mb-1.5">
                        <span>Task load</span>
                        <span className={taskLoadPct >= 100 ? 'text-red-600' : ''}>{m.activeTasks} active</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className={`h-full ${taskLoadPct >= 100 ? 'bg-red-500' : taskLoadPct >= 80 ? 'bg-orange-500' : 'bg-purple-400'}`}
                          style={{ width: `${Math.min(taskLoadPct, 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Project chips */}
                  {m.projects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.projects.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-mono font-medium rounded-[5px] border border-indigo-100">{p}</span>
                      ))}
                    </div>
                  )}
                  {m.projectCount === 0 && m.activeTasks === 0 && (
                    <div className="mt-3 text-xs text-green-600 font-mono flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Available for new work
                    </div>
                  )}
                  {!isExpanded && activeTasks.length > 0 && (
                    <div className="mt-3 text-xs text-indigo-500 font-mono">
                      {activeTasks.length} active task{activeTasks.length > 1 ? 's' : ''} — click to manage
                    </div>
                  )}
                </button>

                {/* Expanded task list */}
                {isExpanded && (
                  <div className="border-t border-stone-100 px-5 pb-5">
                    {/* Next deadline countdown */}
                    {activeTasks.length > 0 && (() => {
                      const sorted = [...activeTasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                      const nextTask = sorted[0];
                      const workHours = workingHoursUntil(nextTask.dueDate);
                      const workDays = Math.floor(workHours / 8);
                      const urgencyColor = workHours < 8 ? 'bg-red-50 border-red-200 text-red-800'
                        : workHours <= 24 ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        : 'bg-green-50 border-green-200 text-green-800';
                      const urgencyIcon = workHours < 8 ? '🚨' : workHours <= 24 ? '⚡' : '✓';
                      return (
                        <div className={`border rounded-[6px] p-4 mb-4 mt-4 ${urgencyColor}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{urgencyIcon}</span>
                              <span className="font-mono font-medium text-xs uppercase tracking-wider">Next Deadline</span>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-light font-serif">{workHours}h</div>
                              <div className="text-xs font-mono opacity-75">
                                {workDays > 0 && `(~${workDays} work day${workDays > 1 ? 's' : ''})`}
                                {workDays === 0 && workHours > 0 && `(today)`}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-medium truncate">{nextTask.title}</div>
                          <div className="text-xs font-mono opacity-75 mt-1">
                            {projects.find(p => p.id === nextTask.projectId)?.name} · Due {fmt(nextTask.dueDate)}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between py-4">
                      <h4 className="text-sm font-medium text-stone-700 font-mono">
                        {activeTasks.length > 0 ? (
                          <span>
                            {activeTasks.length} Active Task{activeTasks.length > 1 ? 's' : ''}
                            {activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) > 0 && (
                              <span className="ml-2 text-indigo-500">
                                ({activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)}h est.)
                              </span>
                            )}
                          </span>
                        ) : 'No active tasks'}
                      </h4>
                      {membersWithHeadroom.filter(x => x.name !== m.name).length > 0 && activeTasks.length > 0 && (
                        <div className="text-xs text-stone-400 font-mono">
                          Headroom: {membersWithHeadroom.filter(x => x.name !== m.name).map(x => x.name).join(', ')}
                        </div>
                      )}
                    </div>

                    {activeTasks.length === 0 ? (
                      <div className="text-center py-6 text-stone-400">
                        <Check className="w-7 h-7 mx-auto mb-2" />
                        <div className="text-sm font-mono">All tasks completed</div>
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
                            <div key={t.id} className={`rounded-[6px] border transition-all ${t.status === 'delayed' ? 'border-red-200 bg-red-50/40' : isReassigning ? 'border-indigo-300 bg-indigo-50/40' : 'border-stone-200 bg-stone-50/60'}`}>
                              <div className="flex items-start p-3 gap-3">
                                <button onClick={() => {
                                    const result = updateTask(t.id, { status: 'completed' });
                                    if (result?.needsHoursLog) setLoggingHoursTask(t.id);
                                  }}
                                  className="mt-0.5 flex-shrink-0" title="Mark complete">
                                  <Circle className="w-4 h-4 text-stone-300 hover:text-green-500 transition-colors" />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-stone-900 text-sm">{t.title}</span>
                                    <span className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded-[5px] ${pi?.color}`}>{t.priority?.toUpperCase()}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Users className="w-3 h-3 text-stone-400" />
                                    <div className="flex items-center gap-1.5">
                                      {(Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]).map((person, idx, arr) => (
                                        <span key={person}>
                                          <span className="text-xs text-stone-500 font-mono">{person}</span>
                                          {idx < arr.length - 1 && <span className="text-stone-300 mx-0.5">·</span>}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-stone-400 font-mono flex-wrap">
                                    <span className="text-indigo-500 font-medium">{proj?.name}</span>
                                    <span>Due {fmt(t.dueDate)}</span>
                                    {du === 0 && <span className="text-orange-600">Today!</span>}
                                    {du > 0 && du <= 3 && <span className="text-yellow-600">in {du}d</span>}
                                    {t.daysDelayed > 0 && <span className="text-red-600">{t.daysDelayed}d overdue</span>}
                                    <span className={`px-1.5 py-0.5 rounded-[5px] font-medium ${si?.color}`}>{si?.label}</span>
                                  </div>
                                </div>
                                {canEdit && (
                                  <button onClick={() => setReassigningTask(isReassigning ? null : t.id)}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] text-xs font-mono font-medium transition-all ${isReassigning ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}>
                                    <Users className="w-3 h-3" /> Reassign
                                  </button>
                                )}
                              </div>

                              {/* Reassign picker */}
                              {canEdit && isReassigning && (
                                <div className="px-3 pb-3">
                                  <div className="text-xs font-mono text-stone-500 mb-2">Pick someone with headroom:</div>
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
                                            className="flex items-center gap-2 px-3 py-2 bg-white border border-indigo-200 rounded-[5px] hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                                            <div>
                                              <div className="text-sm font-medium text-stone-800">{x.name}</div>
                                              <div className={`text-xs font-mono ${xCl.color?.split(' ')[1] || 'text-stone-500'}`}>{xCl.label} · {xPct}%</div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                  </div>
                                  {membersWithHeadroom.filter(x => x.name !== m.name && x.name !== 'Freelancer').length === 0 && (
                                    <div className="text-xs text-stone-400 font-mono">Everyone else is also at capacity.</div>
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
