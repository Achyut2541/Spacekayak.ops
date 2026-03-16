import { useState } from 'react';
import { LayoutDashboard, Check, CheckCircle } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { fmtShort } from '../../lib/utils';
import DashboardStats from './DashboardStats';
import AttentionBanner from './AttentionBanner';
import ProjectCard from './ProjectCard';

const phaseColors = {
  'Kickoff': 'bg-purple-100 text-purple-700', 'Discovery': 'bg-indigo-100 text-indigo-700',
  'Strategy': 'bg-cyan-100 text-cyan-700', 'Branding': 'bg-pink-100 text-pink-700',
  'Design': 'bg-indigo-100 text-indigo-700', 'Development': 'bg-green-100 text-green-700',
  'QA': 'bg-teal-100 text-teal-700', 'Final Delivery': 'bg-emerald-100 text-emerald-700',
  'Complete': 'bg-gray-100 text-gray-700',
};

export default function DashboardView() {
  const {
    viewingAs, searchQuery, showArchived, setShowArchived,
    filterByPerson, setFilterByPerson,
    expandedProjects, toggleExpandProject,
    setEditingProject, setActiveTab, setSelectedProject, setTaskFilter,
  } = useUI();
  const {
    projects, setProjects, tasks, tasksWithStatus, getWorkload, capacityPct,
    canViewAllProjects, canEditProjects, allTeamNames, updateTask,
  } = useData();
  const { currentUser } = useAuth();

  const effectiveUser = viewingAs || currentUser;
  const isManagerView = canViewAllProjects(effectiveUser);
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const getProjectHealth = (project) => {
    const pTasks = tasksWithStatus.filter(t => t.projectId === project.id);
    const overdueCount = pTasks.filter(t => t.status === 'delayed' && t.status !== 'completed').length;
    const daysLeft = Math.ceil((new Date(project.decidedEndDate || project.endDate) - today) / 86400000);
    if (project.status === 'completed') return { label: 'Completed', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
    if (overdueCount >= 2 || daysLeft < 0) return { label: 'At Risk', color: 'bg-red-50 text-red-700', dot: 'bg-red-500' };
    if (overdueCount >= 1 || daysLeft <= 7) return { label: 'Watch', color: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500' };
    return { label: 'On Track', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' };
  };

  let myProjects;
  if (viewingAs || !isManagerView) {
    const myTaskProjectIds = new Set(tasks.filter(t => {
      const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      return a.includes(effectiveUser);
    }).map(t => t.projectId));
    myProjects = projects.filter(p => myTaskProjectIds.has(p.id) && (showArchived || !p.archived));
  } else {
    myProjects = projects.filter(p => showArchived || !p.archived);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    myProjects = myProjects.filter(p => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q));
  }

  const getProjectTasks = (projectId) => {
    let pTasks = tasksWithStatus.filter(t => t.projectId === projectId && t.status !== 'completed');
    if (viewingAs || !isManagerView) {
      pTasks = pTasks.filter(t => {
        const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
        return a.includes(effectiveUser);
      });
    }
    if (filterByPerson) {
      pTasks = pTasks.filter(t => {
        const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
        return a.includes(filterByPerson);
      });
    }
    return pTasks.sort((a, b) => {
      const so = { 'in-progress': 0, 'next-in-line': 1, 'backlog': 2, 'delayed': 3 };
      if (so[a.status] !== so[b.status]) return so[a.status] - so[b.status];
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  };

  const completeTask = (taskId, projectId) => {
    updateTask(taskId, { status: 'completed' });
    const pTasks = tasksWithStatus.filter(t => t.projectId === projectId);
    const idx = pTasks.findIndex(t => t.id === taskId);
    for (let i = idx + 1; i < pTasks.length; i++) {
      if (pTasks[i].status !== 'completed') {
        setTimeout(() => updateTask(pTasks[i].id, { status: 'next-in-line' }), 100);
        break;
      }
    }
  };

  // ── MANAGER VIEW ──
  if (isManagerView) {
    const allActiveTasks = tasksWithStatus.filter(t => t.status !== 'completed');
    const overdueTasks = allActiveTasks.filter(t => t.status === 'delayed');
    const thisWeekTasks = allActiveTasks.filter(t => {
      const diff = Math.ceil((new Date(t.dueDate) - today) / 86400000);
      return diff >= 0 && diff <= 7;
    });
    const teamWl = getWorkload();
    const overloadedMembers = teamWl.filter(m => capacityPct(m) >= 80);
    const atRiskProjects = myProjects.filter(p => {
      const h = getProjectHealth(p);
      return h.label === 'At Risk' || h.label === 'Watch';
    });

    const statsData = [
      { label: 'Active Projects', value: myProjects.filter(p => !p.archived).length, sub: atRiskProjects.length > 0 ? `${atRiskProjects.length} need attention` : 'All looking good', valueColor: 'text-gray-900', subColor: atRiskProjects.length > 0 ? 'text-orange-600' : 'text-green-600' },
      { label: 'Overdue Tasks', value: overdueTasks.length, sub: overdueTasks.length > 0 ? 'Need immediate action' : 'All on schedule', valueColor: overdueTasks.length > 0 ? 'text-red-600' : 'text-gray-900', subColor: overdueTasks.length > 0 ? 'text-red-500' : 'text-green-600' },
      { label: 'Due This Week', value: thisWeekTasks.length, sub: 'Upcoming deadlines', valueColor: 'text-gray-900', subColor: 'text-gray-500' },
      { label: 'Team Overloaded', value: overloadedMembers.length, sub: overloadedMembers.length > 0 ? overloadedMembers.slice(0, 2).map(m => m.name).join(', ') : 'Everyone in good shape', valueColor: overloadedMembers.length > 0 ? 'text-orange-600' : 'text-gray-900', subColor: overloadedMembers.length > 0 ? 'text-orange-500' : 'text-green-600' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-light text-gray-900 font-serif tracking-tight">{greeting}, {viewingAs || currentUser}</h2>
            <p className="text-sm text-gray-400 mt-0.5 font-mono">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2">
            {canViewAllProjects(currentUser) && !viewingAs && (
              <select value={filterByPerson} onChange={e => setFilterByPerson(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-[5px] bg-white focus:border-indigo-500 focus:outline-none">
                <option value="">All members</option>
                {allTeamNames.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            {canEditProjects(currentUser) && (
              <button onClick={() => setShowArchived(!showArchived)}
                className={`px-3 py-2 text-sm rounded-[5px] font-medium transition-colors ${showArchived ? 'bg-gray-200 text-gray-900' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </button>
            )}
          </div>
        </div>

        <DashboardStats stats={statsData} />

        <AttentionBanner
          overdueTasks={overdueTasks}
          overloadedMembers={overloadedMembers}
          projects={projects}
          capacityPct={capacityPct}
        />

        {/* Portfolio Health */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-light text-gray-900 font-serif">Portfolio Health</h3>
            <span className="text-xs text-gray-400 font-mono">{myProjects.length} {myProjects.length === 1 ? 'project' : 'projects'}</span>
          </div>
          {myProjects.length === 0 ? (
            <div className="bg-stone-100 border border-stone-200 rounded-[6px] p-10 text-center text-gray-400">
              <LayoutDashboard className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active projects</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myProjects.map(project => {
                const activeTasks = getProjectTasks(project.id);
                const completedCount = tasks.filter(t => t.projectId === project.id && t.status === 'completed').length;
                const totalCount = tasks.filter(t => t.projectId === project.id).length;
                const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                const health = getProjectHealth(project);
                const daysLeft = Math.ceil((new Date(project.decidedEndDate || project.endDate) - today) / 86400000);
                const currentTask = activeTasks.find(t => t.status === 'in-progress') || activeTasks.find(t => t.status === 'next-in-line') || activeTasks[0];
                const upcomingTasks = activeTasks.filter(t => t.id !== currentTask?.id).slice(0, 3);

                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    health={health}
                    progressPct={progressPct}
                    completedCount={completedCount}
                    totalCount={totalCount}
                    activeTasks={activeTasks}
                    currentTask={currentTask}
                    upcomingTasks={upcomingTasks}
                    daysLeft={daysLeft}
                    isExpanded={expandedProjects.includes(project.id)}
                    onToggle={() => toggleExpandProject(project.id)}
                    onCompleteTask={(taskId) => completeTask(taskId, project.id)}
                    onEdit={() => setEditingProject(project)}
                    onArchive={() => {
                      if (window.confirm(`${project.archived ? 'Unarchive' : 'Archive'} this project?`)) {
                        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, archived: !p.archived } : p));
                      }
                    }}
                    canEdit={canEditProjects(currentUser)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── TEAM MEMBER VIEW ──
  const myActiveTasks = tasksWithStatus.filter(t => {
    const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
    return a.includes(effectiveUser) && t.status !== 'completed';
  }).sort((a, b) => {
    const so = { 'in-progress': 0, 'delayed': 1, 'next-in-line': 2, 'backlog': 3 };
    return (so[a.status] ?? 4) - (so[b.status] ?? 4);
  });

  const myThisWeek = myActiveTasks.filter(t => {
    const diff = Math.ceil((new Date(t.dueDate) - today) / 86400000);
    return diff >= 0 && diff <= 7;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-gray-900 font-serif tracking-tight">{greeting}, {effectiveUser}</h2>
        <p className="text-sm text-gray-400 mt-0.5 font-mono">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Active Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-light text-gray-900 font-serif">Your Active Tasks</h3>
          <span className="text-xs text-gray-400 font-mono">{myActiveTasks.length} tasks</span>
        </div>
        {myActiveTasks.length === 0 ? (
          <div className="bg-stone-100 border border-stone-200 rounded-[6px] p-8 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
            <p className="text-sm font-medium text-gray-700">You're all caught up!</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">No active tasks right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myActiveTasks.map(task => {
              const proj = projects.find(p => p.id === task.projectId);
              return (
                <div key={task.id} className={`bg-stone-100 border rounded-[6px] p-4 hover:-translate-y-px transition-transform ${task.status === 'delayed' ? 'border-red-200 bg-red-50' : task.status === 'in-progress' ? 'border-indigo-200' : 'border-stone-200'}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => completeTask(task.id, task.projectId)}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all group flex items-center justify-center ${task.status === 'in-progress' ? 'border-indigo-600 hover:bg-indigo-600' : task.status === 'delayed' ? 'border-red-500 hover:bg-red-500' : 'border-gray-400 hover:bg-gray-400'}`}
                      title="Mark complete">
                      <Check className="w-3 h-3 text-transparent group-hover:text-white transition-colors" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{task.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${task.status === 'in-progress' ? 'bg-indigo-100 text-indigo-700' : task.status === 'delayed' ? 'bg-red-100 text-red-700' : task.status === 'next-in-line' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {task.status === 'in-progress' ? 'In Progress' : task.status === 'delayed' ? 'Delayed' : task.status === 'next-in-line' ? 'Up Next' : 'Backlog'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${task.priority === 'critical' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {task.priority?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-mono">
                        {proj && <span className="font-medium text-gray-700">{proj.name}</span>}
                        <span>Due {fmtShort(task.dueDate)}</span>
                        {task.estimatedHours && <span>{task.estimatedHours}h est.</span>}
                      </div>
                    </div>
                    <select value={task.status} onChange={e => { e.stopPropagation(); updateTask(task.id, { status: e.target.value }); }}
                      onClick={e => e.stopPropagation()}
                      className="text-xs border border-gray-200 rounded-[5px] px-2 py-1 bg-white focus:outline-none focus:border-indigo-400 flex-shrink-0 font-mono">
                      <option value="backlog">Backlog</option>
                      <option value="next-in-line">Up Next</option>
                      <option value="in-progress">In Progress</option>
                      <option value="delayed">Delayed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Due This Week */}
      {myThisWeek.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-light text-gray-900 font-serif">Due This Week</h3>
            <span className="text-xs text-gray-400 font-mono">{myThisWeek.length} tasks</span>
          </div>
          <div className="bg-stone-100 border border-stone-200 rounded-[6px] divide-y divide-stone-200">
            {myThisWeek.map(task => {
              const proj = projects.find(p => p.id === task.projectId);
              const daysLeft = Math.ceil((new Date(task.dueDate) - today) / 86400000);
              return (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${daysLeft <= 2 ? 'bg-red-500' : daysLeft <= 4 ? 'bg-orange-400' : 'bg-green-400'}`} />
                  <span className="flex-1 text-sm font-medium text-gray-800 truncate">{task.title}</span>
                  {proj && <span className="text-xs text-gray-400 flex-shrink-0 font-mono">{proj.name}</span>}
                  <span className={`text-xs font-semibold flex-shrink-0 font-mono ${daysLeft <= 2 ? 'text-red-600' : daysLeft <= 4 ? 'text-orange-600' : 'text-gray-500'}`}>
                    {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Your Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-light text-gray-900 font-serif">Your Projects</h3>
          <span className="text-xs text-gray-400 font-mono">{myProjects.length} projects</span>
        </div>
        {myProjects.length === 0 ? (
          <div className="bg-stone-100 border border-stone-200 rounded-[6px] p-8 text-center text-gray-400">
            <LayoutDashboard className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No projects assigned yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myProjects.map(project => {
              const completedCount = tasks.filter(t => t.projectId === project.id && t.status === 'completed').length;
              const totalCount = tasks.filter(t => t.projectId === project.id).length;
              const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              const health = getProjectHealth(project);
              return (
                <div key={project.id} className="bg-stone-100 border border-stone-200 rounded-[6px] p-4 flex items-center gap-4 hover:-translate-y-px transition-transform">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${health.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{project.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono font-medium flex-shrink-0 ${phaseColors[project.phase] || 'bg-gray-100 text-gray-700'}`}>{project.phase}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-mono">
                      <span>{project.type}</span>
                      <span>{completedCount}/{totalCount} done</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 font-mono">{progressPct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
