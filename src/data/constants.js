// ═══════════════════════════════════════════════════════════════════════════
// Application Constants
// ═══════════════════════════════════════════════════════════════════════════

export const PHASES = [
  'Kickoff', 'Discovery', 'Strategy', 'Branding',
  'Design', 'Development', 'QA', 'Final Delivery', 'Complete',
];

export const PROJECT_TYPES = [
  'Brand Lite', 'Full Rebrand', 'Video Project', 'Landing Page',
  'Full Website', 'Brand + Website', 'Pitch Deck', 'Product Design', 'Other',
];

export const TASK_STATUSES = [
  { value: 'backlog',      label: 'Backlog',       color: 'bg-gray-100 text-gray-600' },
  { value: 'next-in-line', label: 'Next in Line',  color: 'bg-purple-50 text-purple-700' },
  { value: 'in-progress',  label: 'In Progress',   color: 'bg-amber-50 text-amber-700' },
  { value: 'for-review',   label: 'For Review',    color: 'bg-indigo-50 text-indigo-700' },
  { value: 'client-delay', label: 'Client Delay',  color: 'bg-orange-50 text-orange-700' },
  { value: 'delayed',      label: 'Delayed',       color: 'bg-red-50 text-red-700' },
  { value: 'completed',    label: 'Completed',     color: 'bg-emerald-50 text-emerald-700' },
];

export const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-50' },
  { value: 'high',     label: 'High',     color: 'text-orange-600 bg-orange-50' },
  { value: 'medium',   label: 'Medium',   color: 'text-amber-600 bg-amber-50' },
  { value: 'low',      label: 'Low',      color: 'text-gray-500 bg-gray-50' },
];

export const EMPTY_PROJECT = {
  name: '', type: '', isRetainer: false,
  startDate: '', endDate: '', decidedEndDate: '',
  phase: 'Kickoff', progress: 0,
  team: { am: '', designTeam: [], devTeam: [] },
  notes: '', isStartingSoon: false, confirmedStartDate: null,
  clientDelayDays: 0, archived: false,
};

export const EMPTY_TASK = {
  projectId: '', title: '', assignedTo: [],
  dueDate: '', status: 'backlog', priority: 'medium',
  estimatedHours: null, actualHours: null, clientDelayDays: 0,
  dependsOn: [], blockedBy: [], riskLevel: 'none',
};
