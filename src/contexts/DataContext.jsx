import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { sendSlackNotification, buildTaskAssignedPayload, buildTaskDelayedPayload } from '../lib/slack';
import { getDaysDelayed, isTaskInWeek, daysUntil, uid } from '../lib/utils';
import { PROJECT_TEMPLATES } from '../data/templates';
import { CRISIS_LIB } from '../data/crisis';
import { SEED_TEAM, SEED_PROJECTS, SEED_TASKS, SEED_HISTORICAL } from '../data/seed';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser } = useAuth();

  const [projects, setProjects] = useState(SEED_PROJECTS);
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [teamMembers, setTeamMembers] = useState(SEED_TEAM);
  const [historicalData, setHistoricalData] = useState(SEED_HISTORICAL);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [slackToast, setSlackToast] = useState(null);

  const projectSaveTimer = useRef(null);
  const taskSaveTimer = useRef(null);
  const teamSaveTimer = useRef(null);
  const historySaveTimer = useRef(null);
  const slackToastTimer = useRef(null);

  const triggerSlackToast = useCallback((status) => {
    setSlackToast(status);
    if (slackToastTimer.current) clearTimeout(slackToastTimer.current);
    slackToastTimer.current = setTimeout(() => setSlackToast(null), 3000);
  }, []);

  // ── Boot: load from Supabase ───────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
        const load = Promise.all([supabase.from('projects').select(), supabase.from('tasks').select()]);
        const [{ data: dbP }, { data: dbT }] = await Promise.race([load, timeout.then(() => { throw new Error('timeout'); })]);
        if (dbP?.length > 0) { setProjects(dbP); setTasks(dbT || []); }
      } catch { console.warn('ℹ️ Supabase not configured — using local seed data'); }

      try {
        const { data: dbTeam } = await supabase.from('team_members').select();
        if (dbTeam?.length > 0) setTeamMembers(dbTeam);
      } catch { /* defaults */ }

      try {
        const { data: dbH } = await supabase.from('historical_data').select();
        if (dbH?.length > 0) setHistoricalData(JSON.parse(dbH[0].payload || '{}'));
      } catch { /* defaults */ }

      setDataLoaded(true);
    };
    boot();
  }, []);

  // ── Debounced auto-saves ───────────────────────────────────────────────
  useEffect(() => {
    if (!dataLoaded || !projects.length) return;
    if (projectSaveTimer.current) clearTimeout(projectSaveTimer.current);
    projectSaveTimer.current = setTimeout(async () => {
      try { for (const p of projects) await supabase.from('projects').upsert(p).select(); }
      catch (e) { console.error('❌ Project save failed:', e); }
    }, 1500);
    return () => clearTimeout(projectSaveTimer.current);
  }, [projects, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded || !tasks.length) return;
    if (taskSaveTimer.current) clearTimeout(taskSaveTimer.current);
    taskSaveTimer.current = setTimeout(async () => {
      try { for (const t of tasks) await supabase.from('tasks').upsert(t).select(); }
      catch (e) { console.error('❌ Task save failed:', e); }
    }, 1500);
    return () => clearTimeout(taskSaveTimer.current);
  }, [tasks, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded || !teamMembers.length) return;
    if (teamSaveTimer.current) clearTimeout(teamSaveTimer.current);
    teamSaveTimer.current = setTimeout(async () => {
      try { for (const m of teamMembers) await supabase.from('team_members').upsert(m).select(); }
      catch { /* skip */ }
    }, 2000);
    return () => clearTimeout(teamSaveTimer.current);
  }, [teamMembers, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    if (historySaveTimer.current) clearTimeout(historySaveTimer.current);
    historySaveTimer.current = setTimeout(async () => {
      try { await supabase.from('historical_data').upsert({ id: 'singleton', payload: JSON.stringify(historicalData) }).select(); }
      catch { /* skip */ }
    }, 3000);
    return () => clearTimeout(historySaveTimer.current);
  }, [historicalData, dataLoaded]);

  // ── Derived data ───────────────────────────────────────────────────────
  const activeMembers = useMemo(() => teamMembers.filter(m => m.active !== false), [teamMembers]);
  const designTeam = useMemo(() => activeMembers.filter(m => m.type === 'design').map(m => m.name), [activeMembers]);
  const devTeam = useMemo(() => activeMembers.filter(m => m.type === 'dev').map(m => m.name), [activeMembers]);
  const accountManagers = useMemo(() => activeMembers.filter(m => m.type === 'am').map(m => m.name), [activeMembers]);
  const allTeamNames = useMemo(() => activeMembers.map(m => m.name), [activeMembers]);

  const userRoles = useMemo(() => Object.fromEntries([
    ...activeMembers.map(m => [m.name, m.sysRole || 'team_member']),
    ['Paul', 'leadership'], ['Saaket', 'leadership'],
  ]), [activeMembers]);

  const teamRoles = useMemo(() => Object.fromEntries(
    activeMembers.map(m => [m.name, { role: m.role, type: m.type, maxProjects: m.maxProjects }])
  ), [activeMembers]);

  const getUserRole = useCallback((name) => userRoles[name] || 'team_member', [userRoles]);
  const canEditProjects = useCallback((name) => { const r = getUserRole(name); return r === 'admin' || r === 'am'; }, [getUserRole]);
  const canViewAllProjects = useCallback((name) => { const r = getUserRole(name); return r === 'admin' || r === 'am' || r === 'leadership'; }, [getUserRole]);
  const canViewAs = useCallback((name) => { const r = getUserRole(name); return r === 'admin' || r === 'am'; }, [getUserRole]);

  // Tasks with auto-delayed status
  const tasksWithStatus = useMemo(() => tasks.map(t => {
    const d = getDaysDelayed(t.dueDate, t.status);
    if (d > 0 && t.status !== 'completed' && t.status !== 'delayed' && !t.manualStatus) {
      return { ...t, status: 'delayed', daysDelayed: d };
    }
    return { ...t, daysDelayed: d };
  }), [tasks]);

  // Workload calculation
  const workloadData = useMemo(() => {
    const wl = {};
    allTeamNames.forEach(m => {
      const info = teamRoles[m] || { role: 'Unknown', type: 'design', maxProjects: 2 };
      wl[m] = { name: m, ...info, projects: [], activeTasks: 0, delayedTasks: 0, taskList: [], projectCount: 0, estimatedHours: 0, actualHours: 0, thisWeekTasks: [], nextWeekTasks: [], totalHours: 0 };
    });

    const active = projects.filter(p => p.phase !== 'Complete');
    active.forEach(p => {
      [p.team.am, ...(p.team.designTeam || []), ...(p.team.devTeam || [])].filter(Boolean).forEach(m => {
        if (wl[m] && !wl[m].projects.includes(p.name)) { wl[m].projects.push(p.name); wl[m].projectCount++; }
      });
    });

    const activeIds = new Set(active.map(p => p.id));
    tasksWithStatus.forEach(t => {
      if (!activeIds.has(t.projectId)) return;
      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      assignees.forEach(name => {
        if (!wl[name]) return;
        wl[name].taskList.push(t);
        if (t.status !== 'completed') {
          wl[name].activeTasks++;
          if (t.estimatedHours) { wl[name].estimatedHours += t.estimatedHours; wl[name].totalHours += t.estimatedHours; }
          if (isTaskInWeek(t, 'this-week')) wl[name].thisWeekTasks.push(t);
          if (isTaskInWeek(t, 'next-week')) wl[name].nextWeekTasks.push(t);
        }
        if (t.status === 'completed' && t.actualHours) wl[name].actualHours += t.actualHours;
        if (t.status === 'delayed') wl[name].delayedTasks++;
      });
    });

    return Object.values(wl);
  }, [allTeamNames, teamRoles, projects, tasksWithStatus]);

  const getWorkload = useCallback(() => workloadData, [workloadData]);

  const capacityPct = useCallback((m) => {
    const projPct = m.maxProjects > 0 ? Math.round((m.projectCount / m.maxProjects) * 100) : 0;
    const taskPct = m.activeTasks === 0 ? 0 : Math.min(100, Math.round((m.activeTasks / 8) * 100));
    return Math.max(projPct, taskPct);
  }, []);

  const capacityLabel = useCallback((pct) => {
    if (pct === 0) return { label: 'Available for new work', color: 'bg-emerald-50 text-emerald-700' };
    if (pct <= 50) return { label: 'Has capacity', color: 'bg-indigo-50 text-indigo-700' };
    if (pct <= 75) return { label: 'Busy', color: 'bg-amber-50 text-amber-700' };
    if (pct <= 99) return { label: 'At capacity', color: 'bg-orange-50 text-orange-700' };
    return { label: 'Overloaded', color: 'bg-red-50 text-red-700' };
  }, []);

  // ── CRUD Operations ────────────────────────────────────────────────────

  const generateTasksFromTemplate = useCallback((projectId, projectType) => {
    const types = projectType.split(' + ').map(t => t.trim());
    const newTasks = [];
    let offset = 0;
    types.forEach(type => {
      const tpl = PROJECT_TEMPLATES[type];
      if (!tpl) return;
      tpl.forEach(t => {
        const due = new Date();
        due.setDate(due.getDate() + offset + t.order * 3);
        newTasks.push({
          id: `task-${uid()}`, projectId, title: t.title,
          assignedTo: [], dueDate: due.toISOString().split('T')[0],
          status: t.order === 1 ? 'next-in-line' : 'backlog',
          priority: t.priority, estimatedHours: t.estimatedHours,
          actualHours: null, clientDelayDays: 0,
        });
      });
      offset += tpl.length * 3;
    });
    return newTasks;
  }, []);

  const addProject = useCallback((project, customTasks = []) => {
    const final = { ...project, id: `proj-${Date.now()}`, decidedEndDate: project.decidedEndDate || project.endDate };
    const generated = generateTasksFromTemplate(final.id, final.type);
    const custom = customTasks.map(ct => ({ ...ct, id: `task-${uid()}`, projectId: final.id }));
    setProjects(prev => [...prev, final]);
    if (generated.length || custom.length) setTasks(prev => [...prev, ...generated, ...custom]);
  }, [generateTasksFromTemplate]);

  const updateProject = useCallback((updated) => {
    const final = { ...updated, decidedEndDate: updated.decidedEndDate || updated.endDate };
    setProjects(prev => prev.map(p => p.id === updated.id ? final : p));
  }, []);

  const deleteProject = useCallback((id) => {
    supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.projectId !== id));
  }, []);

  const addTask = useCallback((task) => {
    const t = { id: `t${Date.now()}`, ...task };
    setTasks(prev => [...prev, t]);
    const assignees = Array.isArray(t.assignedTo) ? t.assignedTo.filter(Boolean) : [t.assignedTo].filter(Boolean);
    if (assignees.length) {
      const proj = projects.find(p => p.id === t.projectId);
      sendSlackNotification(buildTaskAssignedPayload({ task: t, projectName: proj?.name || 'Unknown', assignees, assignedBy: currentUser }))
        .then(s => { if (s) triggerSlackToast(s); });
    }
  }, [projects, currentUser, triggerSlackToast]);

  const updateTask = useCallback((id, updates) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return { needsHoursLog: false, needsDelayLog: false };

    if (updates.status === 'client-delay' && task.clientDelayDays === 0) return { needsDelayLog: true };
    if (updates.status === 'completed' && !task.actualHours) return { needsHoursLog: true };

    const extra = updates.status !== undefined ? { manualStatus: true } : {};

    // Slack on reassign
    if (updates.assignedTo && task) {
      const prev = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo].filter(Boolean);
      const next = Array.isArray(updates.assignedTo) ? updates.assignedTo : [updates.assignedTo].filter(Boolean);
      const added = next.filter(a => !prev.includes(a));
      if (added.length) {
        const proj = projects.find(p => p.id === task.projectId);
        sendSlackNotification(buildTaskAssignedPayload({ task: { ...task, ...updates }, projectName: proj?.name || 'Unknown', assignees: added, assignedBy: currentUser, isReassign: true }))
          .then(s => { if (s) triggerSlackToast(s); });
      }
    }

    // Slack on delay
    if (updates.status === 'delayed' && task) {
      const proj = projects.find(p => p.id === task.projectId);
      sendSlackNotification(buildTaskDelayedPayload({ task, projectName: proj?.name || 'Unknown', daysDelayed: task.daysDelayed || 1 }))
        .then(s => { if (s) triggerSlackToast(s); });
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, ...extra } : t));
    return { needsHoursLog: false, needsDelayLog: false };
  }, [tasks, projects, currentUser, triggerSlackToast]);

  const completeTaskWithHours = useCallback((id, hours) => {
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed', actualHours: hours, manualStatus: true } : t));
    if (task && hours) {
      const variance = ((hours - task.estimatedHours) / task.estimatedHours) * 100;
      const type = task.title.split(' ')[0];
      setHistoricalData(prev => ({
        ...prev,
        taskAccuracy: { ...prev.taskAccuracy, [type]: { count: (prev.taskAccuracy[type]?.count || 0) + 1, totalVariance: (prev.taskAccuracy[type]?.totalVariance || 0) + variance, avgVariance: ((prev.taskAccuracy[type]?.totalVariance || 0) + variance) / ((prev.taskAccuracy[type]?.count || 0) + 1) } },
      }));
    }
  }, [tasks]);

  const logClientDelay = useCallback((taskId, days) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'client-delay', clientDelayDays: days, manualStatus: true } : t));
    setProjects(prev => prev.map(p => {
      if (p.id !== task.projectId) return p;
      const end = new Date(p.endDate);
      end.setDate(end.getDate() + days);
      return { ...p, endDate: end.toISOString().split('T')[0], clientDelayDays: (p.clientDelayDays || 0) + days };
    }));
  }, [tasks]);

  const deleteTask = useCallback((id) => {
    supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const addTeamMember = useCallback((member) => {
    setTeamMembers(prev => [...prev, { ...member, id: `tm-${Date.now()}`, active: true }]);
  }, []);

  const updateTeamMember = useCallback((updated) => {
    setTeamMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
  }, []);

  const assessTaskRisk = useCallback((task) => {
    let score = 0;
    const reasons = [];
    const daysLate = getDaysDelayed(task.dueDate, task.status);
    if (daysLate > 0) { score += Math.min(daysLate * 10, 40); reasons.push(`${daysLate}d overdue`); }
    if (task.dependsOn?.length) {
      const blocked = task.dependsOn.filter(id => { const d = tasks.find(t => t.id === id); return d && d.status !== 'completed'; });
      if (blocked.length) { score += blocked.length * 15; reasons.push(`Blocked by ${blocked.length} task(s)`); }
    }
    if (task.assignedTo?.length) {
      const overloaded = (Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo]).filter(p => { const w = workloadData.find(m => m.name === p); return w && w.activeTasks >= 8; });
      if (overloaded.length) { score += overloaded.length * 20; reasons.push('Assignee overloaded'); }
    }
    if (task.priority === 'critical') {
      const left = getDaysDelayed(task.dueDate, 'backlog') <= 0 ? Math.abs(getDaysDelayed(task.dueDate, 'backlog')) : 0;
      if (left <= 2 && left >= 0 && task.status !== 'completed') { score += 25; reasons.push(`Critical task due in ${left}d`); }
    }
    let level = 'none';
    if (score >= 70) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 30) level = 'medium';
    else if (score > 0) level = 'low';
    return { riskLevel: level, riskScore: score, reasons };
  }, [tasks, workloadData]);

  const suggestReassignment = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    const current = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    const needsDesign = /design|wireframe|visual/i.test(task.title);
    const needsDev = /dev|code|implement/i.test(task.title);
    const pool = needsDesign ? designTeam : needsDev ? devTeam : allTeamNames;
    const suggestions = workloadData
      .filter(w => pool.includes(w.name) && !current.includes(w.name) && w.activeTasks < 6)
      .sort((a, b) => a.activeTasks - b.activeTasks)
      .slice(0, 3)
      .map(w => ({ name: w.name, currentTasks: w.activeTasks, capacity: Math.round((1 - w.activeTasks / 8) * 100), reason: w.activeTasks === 0 ? 'Available' : w.activeTasks <= 2 ? 'Light load' : w.activeTasks <= 4 ? 'Moderate load' : 'Busy but has capacity' }));
    return { task, currentAssignees: current, suggestions, reason: current.length === 0 ? 'Unassigned' : 'Overloaded assignee' };
  }, [tasks, workloadData, designTeam, devTeam, allTeamNames]);

  // ── Additional derived helpers ────────────────────────────────────────
  const getRawStatus = useCallback((id) => tasks.find(t => t.id === id)?.status || 'backlog', [tasks]);

  const delayedCount = useMemo(() => tasksWithStatus.filter(t => t.status === 'delayed').length, [tasksWithStatus]);

  const filteredTasks = useCallback((projectId = null, taskFilter = 'all', editingTaskId = null) => {
    let list = tasksWithStatus;
    if (projectId) list = list.filter(t => t.projectId === projectId);
    if (taskFilter !== 'all') list = list.filter(t => t.status === taskFilter || t.id === editingTaskId);
    return list;
  }, [tasksWithStatus]);

  const canStartTask = useCallback((task) => {
    if (!task.dependsOn || task.dependsOn.length === 0) return { canStart: true, blockedBy: [] };
    const blockedBy = task.dependsOn
      .map(depId => tasks.find(t => t.id === depId))
      .filter(dep => dep && dep.status !== 'completed');
    return { canStart: blockedBy.length === 0, blockedBy: blockedBy.map(t => t.title) };
  }, [tasks]);

  const checkWorkloadWarning = useCallback((personName) => {
    const personTasks = tasks.filter(t => {
      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      return assignees.includes(personName) && t.status !== 'completed';
    });
    const tasksByProject = {};
    personTasks.forEach(t => {
      if (!tasksByProject[t.projectId]) tasksByProject[t.projectId] = [];
      tasksByProject[t.projectId].push(t);
    });
    const projectCount = Object.keys(tasksByProject).length;
    const overloadedProjects = Object.entries(tasksByProject).filter(([, ts]) => ts.length >= 4);
    const twoWeeksOut = new Date();
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
    const upcomingTasks = personTasks.filter(t => new Date(t.dueDate) <= twoWeeksOut);

    if (projectCount >= 2 && overloadedProjects.length > 0 && upcomingTasks.length >= 8) {
      return {
        warning: true,
        message: `${personName} is on ${projectCount} projects with ${personTasks.length} active tasks (${upcomingTasks.length} due in next 2 weeks)`,
        tasks: personTasks.map(t => ({ title: t.title, project: projects.find(p => p.id === t.projectId)?.name, dueDate: t.dueDate })),
      };
    }
    if (personTasks.length >= 5) {
      const leastBusy = allTeamNames
        .map(name => ({ name, taskCount: tasks.filter(t => { const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]; return a.includes(name) && t.status !== 'completed'; }).length }))
        .sort((a, b) => a.taskCount - b.taskCount)[0];
      return { warning: false, suggestion: `${personName} has ${personTasks.length} tasks. ${leastBusy.name} has ${leastBusy.taskCount} tasks and may be available.` };
    }
    return { warning: false };
  }, [tasks, projects, allTeamNames]);

  const getRecommendation = useCallback((crisisCategory, crisisScenario, timelineFlex, budgetFlex) => {
    const cat = CRISIS_LIB[crisisCategory];
    const sc = cat?.scenarios.find(s => s.id === crisisScenario);
    if (!sc) return null;
    const teamWl = workloadData;
    const overloaded = teamWl.filter(m => capacityPct(m) >= 90).map(m => m.name);
    const available = teamWl.filter(m => capacityPct(m) < 50 && m.activeTasks > 0).map(m => m.name);

    let primaryAction, tlImpact, costImpact;
    if (timelineFlex > 70) { primaryAction = 'Extend timeline to protect quality — cheapest fix'; tlImpact = '+5-10 days'; costImpact = '$0'; }
    else if (budgetFlex > 70) { primaryAction = 'Deploy external resources to hold the date'; tlImpact = '0 days'; costImpact = '+$2-5K'; }
    else { primaryAction = 'Reduce scope — agree what gets cut, hold date and budget'; tlImpact = '0 days'; costImpact = '$0'; }

    return { scenario: sc.name, primaryAction, tlImpact, costImpact, playbook: sc.playbook, commsKey: sc.commsKey, overloaded, available };
  }, [workloadData, capacityPct]);

  return (
    <DataContext.Provider value={{
      projects, setProjects, tasks, setTasks, teamMembers, setTeamMembers,
      historicalData, setHistoricalData, dataLoaded, slackToast,
      activeMembers, designTeam, devTeam, accountManagers, allTeamNames,
      userRoles, teamRoles, getUserRole, canEditProjects, canViewAllProjects, canViewAs,
      tasksWithStatus, workloadData, getWorkload, capacityPct, capacityLabel,
      addProject, updateProject, deleteProject,
      addTask, updateTask, completeTaskWithHours, logClientDelay, deleteTask,
      addTeamMember, updateTeamMember,
      assessTaskRisk, suggestReassignment,
      generateTasksFromTemplate, triggerSlackToast,
      getRawStatus, delayedCount, filteredTasks, canStartTask,
      checkWorkloadWarning, getRecommendation,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
