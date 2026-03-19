// ═══════════════════════════════════════════════════════════════════════════
// Slack Webhook Integration — Block Kit payloads
// ═══════════════════════════════════════════════════════════════════════════

const SLACK_WEBHOOK_URL = import.meta.env.VITE_SLACK_WEBHOOK_URL || '';

export const sendSlackNotification = async (payload) => {
  if (!SLACK_WEBHOOK_URL) return null;
  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok ? 'sent' : 'error';
  } catch {
    return 'error';
  }
};

const timestamp = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

export const buildTaskAssignedPayload = ({ task, projectName, assignees, assignedBy, isReassign = false }) => {
  const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' }[task.priority] || '⚪';
  const label = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium';
  const due = task.dueDate
    ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'No due date';
  const header = isReassign ? `🔄 Task Reassigned — ${projectName}` : `📋 Task Assigned — ${projectName}`;

  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: header, emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: `*${task.title}*` } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Assigned to*\n${assignees.join(', ')}` },
          { type: 'mrkdwn', text: `*Due*\n${due}` },
          { type: 'mrkdwn', text: `*Priority*\n${emoji} ${label}` },
          { type: 'mrkdwn', text: `*Assigned by*\n${assignedBy}` },
        ],
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `SpaceKayak Operations · ${timestamp()}` }] },
      { type: 'divider' },
    ],
  };
};

export const buildTaskDelayedPayload = ({ task, projectName, daysDelayed }) => {
  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo].filter(Boolean);
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `⚠️ Task Overdue — ${projectName}`, emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: `*${task.title}*` } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Assigned to*\n${assignees.join(', ')}` },
          { type: 'mrkdwn', text: `*Overdue by*\n${daysDelayed} day${daysDelayed !== 1 ? 's' : ''}` },
        ],
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `SpaceKayak Operations · ${timestamp()}` }] },
      { type: 'divider' },
    ],
  };
};
