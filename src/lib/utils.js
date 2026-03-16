// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

export const dateOffset = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const fmt = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const fmtShort = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const daysUntil = (d) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / 86400000);
};

export const getDaysDelayed = (dueDate, status) => {
  if (status === 'completed') return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((today - due) / 86400000);
  return diff > 0 ? diff : 0;
};

export const workingHoursUntil = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  due.setHours(17, 0, 0, 0);
  if (due <= now) return 0;

  let hours = 0;
  let current = new Date(now);
  while (current < due) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      const remaining = Math.min((due - current) / 3600000, 17 - current.getHours() - current.getMinutes() / 60);
      hours += Math.max(0, Math.min(8, remaining));
    }
    current.setDate(current.getDate() + 1);
    current.setHours(9, 0, 0, 0);
  }
  return Math.round(hours * 10) / 10;
};

export const getWeekRange = (weekType) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (weekType === 'this-week') {
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    return { start: new Date(today), end };
  }
  const start = new Date(today);
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
};

export const isTaskInWeek = (task, weekType) => {
  const { start, end } = getWeekRange(weekType);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return due >= start && due <= end;
};

export const uid = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
