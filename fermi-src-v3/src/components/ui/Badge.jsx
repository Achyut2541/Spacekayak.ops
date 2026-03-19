import { TASK_STATUSES, PRIORITIES } from '../../data/constants';

const PHASE_COLORS = {
  'Kickoff': 'bg-violet-50 text-violet-700',
  'Discovery': 'bg-indigo-50 text-indigo-700',
  'Strategy': 'bg-cyan-50 text-cyan-700',
  'Branding': 'bg-pink-50 text-pink-700',
  'Design': 'bg-indigo-50 text-indigo-700',
  'Development': 'bg-emerald-50 text-emerald-700',
  'QA': 'bg-teal-50 text-teal-700',
  'Testing': 'bg-orange-50 text-orange-700',
  'Final Delivery': 'bg-emerald-50 text-emerald-700',
  'Launch': 'bg-red-50 text-red-700',
  'Complete': 'bg-stone-100 text-stone-600',
};

export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const info = TASK_STATUSES.find(s => s.value === status);
  if (!info) return null;
  return <Badge className={info.color}>{info.label}</Badge>;
}

export function PriorityBadge({ priority }) {
  const info = PRIORITIES.find(p => p.value === priority);
  if (!info) return null;
  return <Badge className={info.color}>{priority?.toUpperCase()}</Badge>;
}

export function PhaseBadge({ phase }) {
  const color = PHASE_COLORS[phase] || 'bg-stone-100 text-stone-600';
  return <Badge className={color}>{phase}</Badge>;
}

export function SeverityBadge({ severity }) {
  const color = severity === 'critical'
    ? 'bg-red-100 text-red-700'
    : 'bg-orange-100 text-orange-700';
  return <Badge className={color}>{severity.toUpperCase()}</Badge>;
}

export function RiskBadge({ riskLevel, reasons = [] }) {
  if (riskLevel === 'none') return null;
  const colors = {
    critical: 'bg-red-100 text-red-700 border border-red-300',
    high: 'bg-orange-100 text-orange-700 border border-orange-300',
    medium: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
    low: 'bg-indigo-100 text-indigo-700 border border-indigo-300',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[riskLevel]}`}
      title={reasons.join(', ')}
    >
      {riskLevel.toUpperCase()} RISK
    </span>
  );
}
