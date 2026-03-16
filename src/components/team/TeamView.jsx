import { useState } from 'react';
import { Users, Plus, Edit2 } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY_MEMBER = { name: '', role: '', type: 'design', maxProjects: 2, sysRole: 'team_member' };

const SYS_ROLE_OPTIONS = [
  { value: 'team_member', label: 'Team Member' },
  { value: 'am', label: 'Account Manager' },
  { value: 'admin', label: 'Admin' },
];

export default function TeamView() {
  const { currentUser } = useAuth();
  const { showAddMember, setShowAddMember, editingMember, setEditingMember } = useUI();
  const {
    teamMembers, setTeamMembers, activeMembers,
    canEditProjects, getWorkload, capacityPct, capacityLabel,
  } = useData();

  const [newMember, setNewMember] = useState({ ...EMPTY_MEMBER });

  if (!canEditProjects(currentUser)) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Team management is available to admins and account managers.</p>
      </div>
    );
  }

  const teamWl = getWorkload();
  const getWorkloadForMember = (name) => teamWl.find(m => m.name === name);

  const groups = [
    { label: 'Design Team', type: 'design', badgeColor: 'bg-indigo-100 text-indigo-700' },
    { label: 'Dev Team', type: 'dev', badgeColor: 'bg-green-100 text-green-700' },
    { label: 'Account Managers', type: 'am', badgeColor: 'bg-teal-100 text-teal-700' },
  ];

  const saveMember = () => {
    if (!newMember.name.trim() || !newMember.role.trim()) return;
    if (editingMember) {
      setTeamMembers(teamMembers.map(m => m.id === editingMember.id ? { ...m, ...newMember } : m));
      setEditingMember(null);
    } else {
      const id = 'tm-' + Date.now();
      setTeamMembers([...teamMembers, { ...newMember, id, active: true }]);
      setShowAddMember(false);
    }
    setNewMember({ ...EMPTY_MEMBER });
  };

  const openEdit = (member) => {
    setEditingMember(member);
    setNewMember({ name: member.name, role: member.role, type: member.type, maxProjects: member.maxProjects, sysRole: member.sysRole });
  };

  const toggleActive = (member) => {
    const action = member.active ? 'deactivate' : 'reactivate';
    if (window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${member.name}?`)) {
      setTeamMembers(teamMembers.map(m => m.id === member.id ? { ...m, active: !m.active } : m));
    }
  };

  const closeMemberModal = () => {
    setShowAddMember(false);
    setEditingMember(null);
    setNewMember({ ...EMPTY_MEMBER });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-gray-900 font-serif tracking-tight">Team</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeMembers.length} active &middot; {teamMembers.filter(m => !m.active).length} inactive
          </p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Team Groups */}
      {groups.map(group => {
        const groupMembers = teamMembers.filter(m => m.type === group.type);
        if (groupMembers.length === 0) return null;
        return (
          <div key={group.type}>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">{group.label}</h3>
            <div className="grid grid-cols-1 gap-2">
              {groupMembers.map(member => {
                const wl = getWorkloadForMember(member.name);
                const pct = wl ? capacityPct(wl) : 0;
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-green-500';
                return (
                  <div key={member.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${!member.active ? 'opacity-50' : ''}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${group.badgeColor}`}>
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${member.active ? 'text-gray-900' : 'text-gray-400'}`}>{member.name}</span>
                        {!member.active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">Inactive</span>}
                        <span className="text-xs text-gray-500">{member.role}</span>
                        {member.sysRole !== 'team_member' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold capitalize">{member.sysRole}</span>
                        )}
                      </div>
                      {member.active && wl && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-16 flex-shrink-0">{wl.activeTasks} tasks &middot; {pct}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(member)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Edit member">
                        <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => toggleActive(member)}
                        className={`p-1.5 rounded-lg transition-colors text-xs font-semibold px-2 py-1 ${member.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                      >
                        {member.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add/Edit Member Modal */}
      {(showAddMember || editingMember) && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-light text-gray-900 font-serif">
                {editingMember ? `Edit ${editingMember.name}` : 'Add Team Member'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input type="text" placeholder="e.g. Priya Sharma" value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Role / Title *</label>
                <input type="text" placeholder="e.g. Brand Designer" value={newMember.role}
                  onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Team</label>
                  <select value={newMember.type} onChange={e => setNewMember({ ...newMember, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                    <option value="design">Design</option>
                    <option value="dev">Dev</option>
                    <option value="am">Account Management</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Max Projects</label>
                  <input type="number" min="1" max="5" value={newMember.maxProjects}
                    onChange={e => setNewMember({ ...newMember, maxProjects: parseInt(e.target.value) || 2 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">System Role</label>
                <select value={newMember.sysRole} onChange={e => setNewMember({ ...newMember, sysRole: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                  {SYS_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">Admins & AMs can edit projects and see all dashboards.</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={closeMemberModal} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={saveMember} disabled={!newMember.name.trim() || !newMember.role.trim()}
                className="px-4 py-2 text-sm font-mono font-medium uppercase tracking-wider bg-indigo-600 text-white rounded-[5px] hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {editingMember ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
