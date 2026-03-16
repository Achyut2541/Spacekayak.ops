export function mapBasecampProject(bcProject) {
  const dock = bcProject.dock || [];
  const todoset = dock.find(d => d.name === 'todoset');
  const schedule = dock.find(d => d.name === 'schedule');

  return {
    id: `bc-${bcProject.id}`,
    name: bcProject.name,
    type: bcProject.description || 'Basecamp Project',
    phase: bcProject.status === 'archived' ? 'Complete' : 'Development',
    progress: 0,
    startDate: bcProject.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    endDate: '',
    decidedEndDate: '',
    archived: bcProject.status === 'archived',
    isRetainer: false,
    isStartingSoon: false,
    team: { am: '', designTeam: [], devTeam: [] },
    notes: bcProject.description || '',
    source: 'basecamp',
    basecampId: bcProject.id,
    todosetId: todoset?.id || null,
    scheduleId: schedule?.id || null,
  };
}

export function mapBasecampTodo(bcTodo, projectId) {
  const assignees = (bcTodo.assignees || []).map(a => a.name);

  return {
    id: `bc-${bcTodo.id}`,
    projectId,
    title: bcTodo.content,
    assignedTo: assignees.length > 0 ? assignees : ['Unassigned'],
    dueDate: bcTodo.due_on || '',
    status: bcTodo.completed ? 'completed' : bcTodo.starts_on ? 'in-progress' : 'backlog',
    priority: 'medium',
    estimatedHours: null,
    actualHours: null,
    dependsOn: [],
    clientDelayDays: 0,
    source: 'basecamp',
    basecampId: bcTodo.id,
  };
}

export function mapBasecampPerson(bcPerson) {
  return {
    id: `bc-${bcPerson.id}`,
    name: bcPerson.name,
    role: bcPerson.title || 'Team Member',
    type: 'internal',
    maxProjects: 2,
    active: true,
    sysRole: bcPerson.admin ? 'admin' : 'team_member',
    email: bcPerson.email_address,
    source: 'basecamp',
    basecampId: bcPerson.id,
  };
}
