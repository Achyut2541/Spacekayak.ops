import { useData } from '../../contexts/DataContext';

export default function TimelineView() {
  const { projects, tasks, allTeamNames } = useData();
  const today = new Date();
  const activeProjects = projects.filter(p => p.phase !== 'Complete' && !p.archived);

  const allDates = activeProjects.flatMap(p => [new Date(p.startDate), new Date(p.endDate || p.decidedEndDate)]);
  if (allDates.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-light text-gray-900 font-serif tracking-tight">Project Timeline</h2>
        <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-400">
          <div className="font-bold">No active projects to display</div>
        </div>
      </div>
    );
  }

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / 86400000));

  const getPosition = (date) => (Math.ceil((new Date(date) - minDate) / 86400000) / totalDays) * 100;
  const getWidth = (startDate, endDate) => (Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) / totalDays) * 100;
  const todayPosition = getPosition(today);

  const phaseColors = {
    'Kickoff': 'bg-purple-500', 'Discovery': 'bg-indigo-500', 'Strategy': 'bg-cyan-500',
    'Branding': 'bg-pink-500', 'Design': 'bg-indigo-500', 'Development': 'bg-green-500',
    'QA': 'bg-orange-500', 'Final Delivery': 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light text-gray-900 font-serif tracking-tight">Project Timeline</h2>
        <p className="text-gray-500 mt-1">Gantt view of all active projects</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-sm font-semibold text-gray-700 mb-4">
          {minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ({totalDays} days)
        </div>
        <div className="relative" style={{ minHeight: `${activeProjects.length * 60 + 100}px` }}>
          {/* Today indicator */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${todayPosition}%` }}>
            <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">TODAY</div>
          </div>

          {/* Month markers */}
          <div className="absolute top-0 left-0 right-0 h-8 border-b border-gray-200 flex">
            {Array.from({ length: Math.ceil(totalDays / 30) }).map((_, idx) => {
              const monthDate = new Date(minDate);
              monthDate.setDate(monthDate.getDate() + (idx * 30));
              return (
                <div key={idx} className="text-xs text-gray-500 font-semibold"
                  style={{ position: 'absolute', left: `${(idx * 30 / totalDays) * 100}%`, top: 0 }}>
                  {monthDate.toLocaleDateString('en-US', { month: 'short' })}
                </div>
              );
            })}
          </div>

          {/* Project bars */}
          <div className="pt-12 space-y-2">
            {activeProjects.map(project => {
              const startPos = getPosition(project.startDate);
              const barWidth = getWidth(project.startDate, project.endDate || project.decidedEndDate);
              const daysLeft = Math.ceil((new Date(project.endDate || project.decidedEndDate) - today) / 86400000);
              const isLate = daysLeft < 0;
              const isUrgent = daysLeft <= 7 && daysLeft >= 0;

              return (
                <div key={project.id} className="relative h-12 flex items-center">
                  <div className="absolute left-0 w-48 text-sm font-semibold text-gray-900 truncate pr-2">{project.name}</div>
                  <div
                    className={`absolute h-8 rounded shadow-md ${phaseColors[project.phase] || 'bg-gray-500'} ${isLate ? 'opacity-60' : ''}`}
                    style={{ left: `calc(12rem + ${startPos}%)`, width: `${barWidth}%` }}
                    title={`${project.name}: ${project.startDate} → ${project.endDate || project.decidedEndDate}`}>
                    <div className="px-2 py-1 text-white text-xs font-semibold truncate">{project.phase}</div>
                    {isLate && <div className="absolute -top-6 left-0 bg-red-600 text-white text-xs px-2 py-0.5 rounded">{Math.abs(daysLeft)}d late</div>}
                    {isUrgent && <div className="absolute -top-6 right-0 bg-orange-600 text-white text-xs px-2 py-0.5 rounded">{daysLeft}d left</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Capacity heatmap */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Team Capacity Heatmap (Next 4 Weeks)</h3>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, weekIdx) => {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() + (weekIdx * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return (
              <div key={weekIdx} className="rounded-lg p-3 bg-gray-50">
                <div className="text-sm font-bold text-gray-900 mb-2">Week {weekIdx + 1}</div>
                <div className="text-xs text-gray-600 mb-3">
                  {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="space-y-1">
                  {allTeamNames.slice(0, 8).map(member => {
                    const memberTasks = tasks.filter(t => {
                      const dueDate = new Date(t.dueDate);
                      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
                      return assignees.includes(member) && t.status !== 'completed' && dueDate >= weekStart && dueDate <= weekEnd;
                    });
                    const load = memberTasks.length;
                    const loadColor = load === 0 ? 'bg-gray-100' : load <= 2 ? 'bg-green-200' : load <= 4 ? 'bg-yellow-200' : load <= 6 ? 'bg-orange-200' : 'bg-red-200';
                    return (
                      <div key={member} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${loadColor}`} title={`${load} tasks`} />
                        <div className="text-xs text-gray-700 truncate">{member}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
