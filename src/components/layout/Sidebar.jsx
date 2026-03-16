import { LayoutDashboard, Target, List, Users, Calendar, AlertTriangle, AlertCircle } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
  { id: 'projects', icon: Target, label: 'Projects', showCount: 'projects' },
  { id: 'tasks', icon: List, label: 'Tasks', showCount: 'openTasks', showAlert: 'delayed' },
  { id: 'capacity', icon: Users, label: 'Capacity', showCount: 'team' },
  { id: 'timeline', icon: Calendar, label: 'Timeline' },
  { id: 'risk', icon: AlertTriangle, label: 'Risk & Resources' },
  { id: 'crisis', icon: AlertCircle, label: 'Crisis Nav' },
];

export default function Sidebar() {
  const { activeTab, setActiveTab } = useUI();
  const { projects, tasks, activeMembers, canEditProjects } = useData();
  const { currentUser } = useAuth();

  const openTasks = tasks.filter(t => t.status !== 'completed').length;
  const delayedCount = tasks.filter(t => {
    if (t.status === 'completed') return false;
    return new Date(t.dueDate) < new Date() && t.status !== 'completed';
  }).length;

  const counts = {
    projects: projects.length,
    openTasks,
    team: activeMembers.length,
    delayed: delayedCount,
  };

  const items = [
    ...NAV_ITEMS,
    ...(canEditProjects(currentUser) ? [{ id: 'team', icon: Users, label: 'Team', showCount: 'team' }] : []),
  ];

  return (
    <div className="w-56 flex-shrink-0">
      <div className="bg-[#F6F5F2] border border-[#E8E5E0] rounded-xl overflow-hidden sticky top-20 flex flex-col">
        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-[#E8E5E0]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#2A7A5B] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-black tracking-tight">SK</span>
            </div>
            <div>
              <div className="text-stone-900 text-sm font-semibold leading-tight">SpaceKayak</div>
              <div className="text-stone-400 text-xs font-mono leading-tight tracking-wide">OPS CENTER</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3 space-y-0.5 flex-1">
          {items.map(({ id, icon: Icon, label, showCount, showAlert }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-all rounded-[5px] ${
                activeTab === id
                  ? 'bg-[#2A7A5B] text-white'
                  : 'text-stone-500 hover:bg-[#EFEDE8] hover:text-stone-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {showCount && counts[showCount] !== undefined && (
                  <span className={`text-xs font-mono font-medium tabular-nums ${activeTab === id ? 'text-white/70' : 'text-stone-400'}`}>
                    {counts[showCount]}
                  </span>
                )}
                {showAlert && counts[showAlert] > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full font-mono">
                    {counts[showAlert]}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mx-3 mb-3 p-3 bg-white/60 rounded-lg space-y-2 text-xs border border-[#E8E5E0]">
          <div className="flex justify-between items-center">
            <span className="text-stone-400 font-mono uppercase tracking-wide text-[0.6rem]">Active Projects</span>
            <span className="font-semibold text-stone-700 font-mono">{projects.filter(p => p.phase !== 'Complete').length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-400 font-mono uppercase tracking-wide text-[0.6rem]">Open Tasks</span>
            <span className="font-semibold text-stone-700 font-mono">{openTasks}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-400 font-mono uppercase tracking-wide text-[0.6rem]">Delayed</span>
            <span className={`font-bold font-mono ${delayedCount > 0 ? 'text-red-500' : 'text-[#2A7A5B]'}`}>
              {delayedCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
