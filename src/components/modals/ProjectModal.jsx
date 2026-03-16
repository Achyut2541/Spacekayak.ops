import { useData } from '../../contexts/DataContext';
import { PROJECT_TEMPLATES as projectTemplates } from '../../data/templates';

export default function ProjectModal({
  title, data, setData, onSave, onCancel,
  phases, isEdit = false, customTasks = [], setCustomTasks = null,
}) {
  const { designTeam, devTeam, getWorkload, capacityPct, capacityLabel } = useData();

  const renderTeamSelector = (label, team, teamKey, colorScheme) => {
    const selected = data.team?.[teamKey] || [];
    return (
      <div>
        <label className="block text-xs font-semibold mb-1 text-gray-700">{label}</label>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selected.map(person => (
              <span key={person} className={`inline-flex items-center gap-1 px-2 py-1 ${colorScheme.badge} text-xs font-medium rounded`}>
                {person}
                <button onClick={() => {
                  const updated = selected.filter(p => p !== person);
                  setData({ ...data, team: { ...data.team, [teamKey]: updated } });
                }} className={colorScheme.closeHover}>&times;</button>
              </span>
            ))}
          </div>
        )}
        <div className="border border-gray-300 rounded-lg p-1.5 max-h-28 overflow-y-auto">
          {team.filter(d => !selected.includes(d)).map(person => {
            const memberWorkload = getWorkload().find(w => w.name === person);
            const pct = memberWorkload ? capacityPct(memberWorkload) : 0;
            const cl = capacityLabel(pct);
            const hasIssues = memberWorkload && (memberWorkload.delayedTasks > 0 || pct >= 100);
            return (
              <button key={person} onClick={() => {
                const updated = [...selected, person];
                setData({ ...data, team: { ...data.team, [teamKey]: updated } });
              }} className={`w-full text-left px-1.5 py-1 text-xs rounded ${colorScheme.hover} transition-colors mb-0.5 ${
                hasIssues ? 'bg-orange-50 border border-orange-200' : 'border border-transparent'
              }`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-gray-900 text-xs">{person}</span>
                  <span className={`text-xs px-1 py-0.5 rounded font-semibold ${cl.color}`}>{pct}%</span>
                </div>
                {memberWorkload && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span>{memberWorkload.projectCount}/{memberWorkload.maxProjects} proj</span>
                    <span>&bull;</span>
                    <span>{memberWorkload.activeTasks} tasks</span>
                    {memberWorkload.estimatedHours > 0 && (<><span>&bull;</span><span>{memberWorkload.estimatedHours}h</span></>)}
                    {memberWorkload.delayedTasks > 0 && (<><span>&bull;</span><span className="text-red-600 font-semibold">{memberWorkload.delayedTasks} delayed</span></>)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="space-y-2.5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Project Name *</label>
            <input type="text" value={data.name || ''} onChange={e => setData({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
          </div>

          {/* Type + AM */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Project Type(s) *</label>
              {(data.type || '').split(' + ').filter(Boolean).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(data.type || '').split(' + ').filter(Boolean).map(type => (
                    <span key={type} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                      {type}
                      <button onClick={() => {
                        const types = (data.type || '').split(' + ').filter(t => t !== type);
                        setData({ ...data, type: types.join(' + ') });
                      }} className="hover:text-purple-900">&times;</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="border border-gray-300 rounded-lg p-1.5 max-h-24 overflow-y-auto">
                {['Brand Lite', 'Full Rebrand', 'Landing Page', 'Full Website', 'Video Project', 'Pitch Deck', 'Product Design', 'Other'].map(type => {
                  if ((data.type || '').includes(type)) return null;
                  return (
                    <button key={type} onClick={() => {
                      const currentTypes = (data.type || '').split(' + ').filter(Boolean);
                      setData({ ...data, type: [...currentTypes, type].join(' + ') });
                    }} className="w-full text-left px-2 py-1 text-xs rounded hover:bg-purple-50 transition-colors">
                      <span className="font-medium">{type}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 mt-1">Click to add multiple types</div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Account Manager *</label>
              <select value={data.team?.am || ''} onChange={e => setData({ ...data, team: { ...data.team, am: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none">
                <option value="">Select AM...</option>
                {['Achyut', 'Hari', 'Neel'].map(am => <option key={am} value={am}>{am}</option>)}
              </select>
            </div>
          </div>

          {/* Team Selection */}
          <div className="grid grid-cols-2 gap-3">
            {renderTeamSelector('Design Team', designTeam, 'designTeam', {
              badge: 'bg-indigo-100 text-indigo-700', closeHover: 'hover:text-indigo-900', hover: 'hover:bg-indigo-50',
            })}
            {renderTeamSelector('Dev Team', devTeam, 'devTeam', {
              badge: 'bg-green-100 text-green-700', closeHover: 'hover:text-green-900', hover: 'hover:bg-green-50',
            })}
          </div>

          {/* Dates + Phase */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Start Date *</label>
              <input type="date" value={data.startDate || ''} onChange={e => setData({ ...data, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Decided End Date *</label>
              <input type="date" value={data.decidedEndDate || ''} onChange={e => setData({ ...data, decidedEndDate: e.target.value, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Phase</label>
              <select value={data.phase || 'Kickoff'} onChange={e => setData({ ...data, phase: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none">
                {phases.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Progress: {data.progress || 0}%</label>
            <input type="range" min="0" max="100" value={data.progress || 0}
              onChange={e => setData({ ...data, progress: +e.target.value })} className="w-full" />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.isRetainer || false} onChange={e => setData({ ...data, isRetainer: e.target.checked })} className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">Retainer</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.isStartingSoon || false} onChange={e => setData({ ...data, isStartingSoon: e.target.checked })} className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">Starting Soon</span>
            </label>
          </div>

          {/* Template preview */}
          {data.type && (() => {
            const types = data.type.split(' + ').map(t => t.trim());
            const hasTemplates = types.some(t => projectTemplates[t]);
            if (!hasTemplates && !setCustomTasks) return null;

            let taskCount = 0;
            types.forEach(t => { if (projectTemplates[t]) taskCount += projectTemplates[t].length; });
            const totalTasks = taskCount + (customTasks?.length || 0);

            return (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="text-indigo-600 mt-0.5">*</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-indigo-900 mb-1">
                      {totalTasks} task{totalTasks !== 1 ? 's' : ''} will be auto-created
                    </div>
                    {hasTemplates && (
                      <div className="text-xs text-indigo-700 space-y-0.5 mb-2">
                        {types.map(type => {
                          const template = projectTemplates[type];
                          if (!template) return null;
                          return <div key={type}><span className="font-semibold">{type}:</span> {template.map(t => t.title).join(', ')}</div>;
                        })}
                      </div>
                    )}
                    {customTasks && customTasks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-semibold text-indigo-900">Custom tasks:</div>
                        {customTasks.map((ct, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1">
                            <span className="flex-1">{ct.title}</span>
                            <span className="text-gray-500">{ct.estimatedHours}h</span>
                            <button onClick={() => setCustomTasks(customTasks.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-800 font-bold">&times;</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {setCustomTasks && (
                      <button onClick={() => {
                        const taskTitle = prompt('Task name:');
                        if (!taskTitle) return;
                        const hours = parseInt(prompt('Estimated hours:', '8'));
                        if (isNaN(hours)) return;
                        setCustomTasks([...customTasks, {
                          title: taskTitle, assignedTo: [], dueDate: '', status: 'backlog',
                          priority: 'medium', estimatedHours: hours, actualHours: null, clientDelayDays: 0,
                        }]);
                      }} className="mt-2 text-xs bg-white text-indigo-700 px-3 py-1.5 rounded border border-indigo-300 hover:bg-indigo-100 font-semibold">
                        + Add Custom Task
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Notes (edit mode only) */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Notes</label>
              <textarea value={data.notes || ''} onChange={e => setData({ ...data, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
                rows="2" placeholder="Add project notes, context, or status updates..." />
            </div>
          )}

          {data.isStartingSoon && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Confirmed Start Date</label>
              <input type="date" value={data.confirmedStartDate || ''} onChange={e => setData({ ...data, confirmedStartDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
          <button onClick={onSave}
            disabled={!data.name || !data.type || !data.startDate || !data.decidedEndDate || !data.team?.am}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
            Save Project
          </button>
          <button onClick={onCancel}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
