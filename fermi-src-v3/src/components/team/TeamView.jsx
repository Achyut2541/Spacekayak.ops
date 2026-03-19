import { useState } from 'react';
import { Users, Plus, Edit2, AlertTriangle } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY_MEMBER = { name: '', role: '', type: 'design', maxProjects: 2, sysRole: 'team_member' };

const SYS_ROLE_OPTIONS = [
  { value: 'team_member', label: 'Team Member' },
  { value: 'am', label: 'Account Manager' },
  { value: 'leadership', label: 'Leadership' },
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
  const [confirmDeactivateId, setConfirmDeactivateId] = useState(null);

  if (!canEditProjects(currentUser)) {
    return (
      <div className="text-center py-16 text-stone-400">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-mono">Team management is available to admins and account managers.</p>
      </div>
    );
  }

  const teamWl = getWorkload();
  const getWorkloadForMember = (name) => teamWl.find(m => m.name === name);

  const groups = [
    { label: 'Design Team', type: 'design', badgeColor: 'bg-indigo-100 text-indigo-700' },
    { label: 'Dev Team', type: 'dev', badgeColor: 'bg-green-100 text-green-700' },
    { label: 'Account Managers', type: 'am', badgeColor: 'bg-amber-100 text-amber-700' },
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
    if (!member.active) {
      // reactivate: no confirm needed
      setTeamMembers(teamMembers.map(m => m.id === member.id ? { ...m, active: true } : m));
    } else {
      setConfirmDeactivateId(member.id);
    }
  };

  const confirmDeactivate = (id) => {
    setTeamMembers(teamMembers.map(m => m.id === id ? { ...m, active: false } : m));
    setConfirmDeactivateId(null);
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
          <h2 className="text-3xl font-light text-stone-900 font-serif tracking-tight">Team</h2>
          <p className="text-xs text-stone-400 mt-0.5 font-mono">
            {activeMembers.length} active &middot; {teamMembers.filter(m => !m.active).length} inactive
          </p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 transition-opacity"
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
            <h3 className="gravity-label mb-2">{group.label}</h3>
            <div className="grid grid-cols-1 gap-2">
              {groupMembers.map(member => {
                const wl = getWorkloadForMember(member.name);
                const pct = wl ? capacityPct(wl) : 0;
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-green-500';
                return (
                  <div key={member.id} className={`bg-white border rounded-[6px] transition-all ${confirmDeactivateId === member.id ? 'border-red-300 bg-red-50/40' : !member.active ? 'opacity-50 border-stone-200' : 'border-stone-200'}`}>
                    {/* Deactivate confirmation banner */}
                    {confirmDeactivateId === member.id && (
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-200">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          Deactivate <span className="font-bold">{member.name}</span>?
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => confirmDeactivate(member.id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-mono font-medium rounded-[5px] hover:opacity-85 transition-opacity">
                            Deactivate
                          </button>
                          <button onClick={() => setConfirmDeactivateId(null)}
                            className="px-3 py-1.5 border border-stone-200 text-stone-600 text-xs font-medium rounded-[5px] hover:bg-stone-50 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="p-4 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${group.badgeColor}`}>
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm ${member.active ? 'text-stone-900' : 'text-stone-400'}`}>{member.name}</span>
                          {!member.active && <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 font-mono">Inactive</span>}
                          <span className="text-xs text-stone-400 font-mono">{member.role}</span>
                          {member.sysRole !== 'team_member' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-mono capitalize">{member.sysRole}</span>
                          )}
                        </div>
                        {member.active && wl && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-xs text-stone-400 w-20 flex-shrink-0 font-mono">{wl.activeTasks} tasks · {pct}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(member)} className="p-1.5 hover:bg-stone-100 rounded-[5px] transition-colors" title="Edit member">
                          <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                        </button>
                        <button
                          onClick={() => toggleActive(member)}
                          className={`px-2.5 py-1 rounded-[5px] transition-colors text-xs font-mono font-medium ${member.active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                        >
                          {member.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[8px] w-full max-w-md border border-stone-200">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="text-lg font-light text-stone-900 font-serif">
                {editingMember ? `Edit ${editingMember.name}` : 'Add Team Member'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Full Name *</label>
                <input type="text" placeholder="e.g. Priya Sharma" value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full border border-stone-200 rounded-[5px] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Role / Title *</label>
                <input type="text" placeholder="e.g. Brand Designer" value={newMember.role}
                  onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full border border-stone-200 rounded-[5px] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Team</label>
                  <select value={newMember.type} onChange={e => setNewMember({ ...newMember, type: e.target.value })}
                    className="w-full border border-stone-200 rounded-[5px] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                    <option value="design">Design</option>
                    <option value="dev">Dev</option>
                    <option value="am">Account Management</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Max Projects</label>
                  <input type="number" min="1" max="5" value={newMember.maxProjects}
                    onChange={e => setNewMember({ ...newMember, maxProjects: parseInt(e.target.value) || 2 })}
                    className="w-full border border-stone-200 rounded-[5px] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">System Role</label>
                <select value={newMember.sysRole} onChange={e => setNewMember({ ...newMember, sysRole: e.target.value })}
                  className="w-full border border-stone-200 rounded-[5px] px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                  {SYS_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="text-xs text-stone-400 font-mono mt-1">Admins & AMs can edit projects and see all dashboards.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-3">
              <button onClick={closeMemberModal} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-[5px] transition-colors">Cancel</button>
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
