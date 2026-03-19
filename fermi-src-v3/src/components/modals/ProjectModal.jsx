import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { PROJECT_TEMPLATES as projectTemplates } from '../../data/templates';

// ── Pill-based team member picker ─────────────────────────────────────────
function TeamPicker({ label, team, selectedKey, data, setData, pillCls, rowAccentCls }) {
  const { getWorkload, capacityPct, capacityLabel } = useData();
  const selected = data.team?.[selectedKey] || [];
  const workloads = getWorkload();

  const toggle = (person) => {
    const next = selected.includes(person)
      ? selected.filter(p => p !== person)
      : [...selected, person];
    setData({ ...data, team: { ...data.team, [selectedKey]: next } });
  };

  return (
    <div>
      <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-2">{label}</label>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(person => (
            <span key={person} className={`inline-flex items-center gap-1 px-2.5 py-1 ${pillCls} text-xs font-medium rounded-full`}>
              {person}
              <button onClick={() => toggle(person)} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Picker list */}
      <div className="border border-stone-200 rounded-[6px] overflow-hidden max-h-[148px] overflow-y-auto">
        {team.filter(p => !selected.includes(p)).length === 0 ? (
          <div className="px-3 py-3 text-xs text-stone-400 text-center font-mono">All assigned</div>
        ) : team.filter(p => !selected.includes(p)).map(person => {
          const wl = workloads.find(w => w.name === person);
          const pct = wl ? capacityPct(wl) : 0;
          const cl = capacityLabel(pct);
          const hasIssues = wl && (wl.delayedTasks > 0 || pct >= 100);
          return (
            <button key={person} onClick={() => toggle(person)}
              className={`w-full text-left px-3 py-2 transition-colors border-b border-stone-100 last:border-0 ${rowAccentCls} ${hasIssues ? 'bg-orange-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-900">{person}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${cl.color}`}>{pct}%</span>
              </div>
              {wl && (
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-400 font-mono">
                  <span>{wl.projectCount}/{wl.maxProjects} proj</span>
                  <span>·</span>
                  <span>{wl.activeTasks} tasks</span>
                  {wl.estimatedHours > 0 && <><span>·</span><span>{wl.estimatedHours}h</span></>}
                  {wl.delayedTasks > 0 && <><span>·</span><span className="text-red-500 font-bold">{wl.delayedTasks} delayed</span></>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Inline custom task mini-form ──────────────────────────────────────────
function CustomTaskForm({ onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), estimatedHours: parseFloat(hours) || null });
    setTitle('');
    setHours('');
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="text" value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        placeholder="Task name…"
        className="flex-1 px-3 py-1.5 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none bg-white"
        autoFocus
      />
      <input
        type="number" value={hours} onChange={e => setHours(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        placeholder="hrs" step="0.5" min="0"
        className="w-16 px-2 py-1.5 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none bg-white text-center"
      />
      <button onClick={submit} disabled={!title.trim()}
        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-mono font-medium rounded-[5px] hover:opacity-85 disabled:opacity-40 transition-opacity flex-shrink-0">
        Add
      </button>
      <button onClick={onCancel} className="p-1.5 hover:bg-stone-100 rounded-[5px] transition-colors flex-shrink-0">
        <X className="w-3.5 h-3.5 text-stone-400" />
      </button>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────
export default function ProjectModal({
  title, data, setData, onSave, onCancel,
  phases, isEdit = false, customTasks = [], setCustomTasks = null,
}) {
  const { designTeam, devTeam, accountManagers } = useData();
  const [showCustomTaskForm, setShowCustomTaskForm] = useState(false);

  const PROJECT_TYPES = [
    'Brand Lite', 'Full Rebrand', 'Landing Page', 'Full Website',
    'Video Project', 'Pitch Deck', 'Product Design', 'Brand + Website', 'Other',
  ];

  const selectedTypes = (data.type || '').split(' + ').filter(Boolean);

  const toggleType = (type) => {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    setData({ ...data, type: next.join(' + ') });
  };

  const templateTaskCount = selectedTypes.reduce((acc, t) => acc + (projectTemplates[t]?.length || 0), 0);
  const totalTasks = templateTaskCount + (customTasks?.length || 0);

  const isValid = data.name?.trim() && data.type && data.startDate && data.decidedEndDate && data.team?.am;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[8px] w-full max-w-2xl max-h-[90vh] flex flex-col border border-stone-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-shrink-0">
          <h3 className="text-lg font-light text-stone-900 font-serif tracking-tight">{title}</h3>
          <button onClick={onCancel} className="p-1.5 hover:bg-stone-100 rounded-[5px] transition-colors">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">

          {/* ── Section: Project Details ── */}
          <div className="space-y-4">
            <p className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest pb-1 border-b border-stone-100">Project Details</p>

            {/* Name */}
            <div>
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Project Name *</label>
              <input
                type="text" value={data.name || ''} onChange={e => setData({ ...data, name: e.target.value })}
                autoFocus
                placeholder="e.g., Mokobara Rebrand"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none transition-colors placeholder-stone-300"
              />
            </div>

            {/* Type — toggle chip grid */}
            <div>
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Project Type *</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_TYPES.map(type => {
                  const active = selectedTypes.includes(type);
                  return (
                    <button key={type} onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-stone-500 border-stone-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}>
                      {active ? '✓ ' : ''}{type}
                    </button>
                  );
                })}
              </div>
              {selectedTypes.length === 0 && (
                <p className="text-[11px] text-stone-400 font-mono mt-1.5">Select one or more — task templates will be auto-applied</p>
              )}
            </div>

            {/* AM + Phase row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Account Manager *</label>
                <select value={data.team?.am || ''} onChange={e => setData({ ...data, team: { ...data.team, am: e.target.value } })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none bg-white appearance-none">
                  <option value="">Select AM…</option>
                  {accountManagers.map(am => <option key={am} value={am}>{am}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Phase</label>
                <select value={data.phase || 'Kickoff'} onChange={e => setData({ ...data, phase: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none bg-white appearance-none">
                  {phases.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Section: Timeline ── */}
          <div className="space-y-4">
            <p className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest pb-1 border-b border-stone-100">Timeline</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Start Date *</label>
                <input type="date" value={data.startDate || ''} onChange={e => setData({ ...data, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Delivery Date *</label>
                <input type="date" value={data.decidedEndDate || ''} onChange={e => setData({ ...data, decidedEndDate: e.target.value, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none" />
              </div>
            </div>

            {/* Toggle switches */}
            <div className="flex items-center gap-6">
              {[
                { key: 'isRetainer', label: 'Retainer', activeColor: 'bg-indigo-600' },
                { key: 'isStartingSoon', label: 'Starting Soon', activeColor: 'bg-amber-500' },
              ].map(({ key, label, activeColor }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <button
                    onClick={() => setData({ ...data, [key]: !data[key] })}
                    className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${data[key] ? activeColor : 'bg-stone-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm mt-0.5 transition-transform ${data[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-stone-700">{label}</span>
                </label>
              ))}
            </div>

            {data.isStartingSoon && (
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Confirmed Start Date</label>
                <input type="date" value={data.confirmedStartDate || ''} onChange={e => setData({ ...data, confirmedStartDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none" />
              </div>
            )}

            {/* Progress slider — edit mode only */}
            {isEdit && (
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Progress — <span className="text-indigo-600 font-bold">{data.progress || 0}%</span>
                </label>
                <input type="range" min="0" max="100" value={data.progress || 0}
                  onChange={e => setData({ ...data, progress: +e.target.value })}
                  className="w-full accent-indigo-600" />
              </div>
            )}
          </div>

          {/* ── Section: Team ── */}
          <div className="space-y-4">
            <p className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest pb-1 border-b border-stone-100">Team</p>
            <div className="grid grid-cols-2 gap-4">
              <TeamPicker
                label="Design Team" team={designTeam} selectedKey="designTeam"
                data={data} setData={setData}
                pillCls="bg-indigo-100 text-indigo-700"
                rowAccentCls="hover:bg-indigo-50"
              />
              <TeamPicker
                label="Dev Team" team={devTeam} selectedKey="devTeam"
                data={data} setData={setData}
                pillCls="bg-emerald-100 text-emerald-700"
                rowAccentCls="hover:bg-emerald-50"
              />
            </div>
          </div>

          {/* ── Section: Tasks preview ── */}
          {data.type && (templateTaskCount > 0 || (customTasks?.length || 0) > 0) && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest pb-1 border-b border-stone-100">Tasks</p>
              <div className="bg-indigo-50 border border-indigo-100 rounded-[6px] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-indigo-700">
                    {totalTasks} task{totalTasks !== 1 ? 's' : ''} will be created
                  </span>
                </div>
                <div className="space-y-1 text-xs text-indigo-600 font-mono">
                  {selectedTypes.map(type => {
                    const tpl = projectTemplates[type];
                    if (!tpl) return null;
                    return (
                      <div key={type}>
                        <span className="font-bold text-indigo-800">{type}:</span>{' '}
                        <span className="text-indigo-600">{tpl.map(t => t.title).join(', ')}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom tasks list */}
                {customTasks && customTasks.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-wider">Custom</p>
                    {customTasks.map((ct, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white/80 rounded-[5px] px-3 py-1.5">
                        <span className="flex-1 text-xs text-stone-800">{ct.title}</span>
                        {ct.estimatedHours && <span className="text-[11px] text-stone-400 font-mono">{ct.estimatedHours}h</span>}
                        <button onClick={() => setCustomTasks(customTasks.filter((_, i) => i !== idx))}
                          className="text-stone-300 hover:text-red-500 transition-colors ml-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline custom task form */}
                {setCustomTasks && (
                  showCustomTaskForm ? (
                    <CustomTaskForm
                      onAdd={(task) => {
                        setCustomTasks([...customTasks, { ...task, assignedTo: [], dueDate: '', status: 'backlog', priority: 'medium', actualHours: null, clientDelayDays: 0 }]);
                        setShowCustomTaskForm(false);
                      }}
                      onCancel={() => setShowCustomTaskForm(false)}
                    />
                  ) : (
                    <button onClick={() => setShowCustomTaskForm(true)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-mono font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add custom task
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          <div>
            <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={data.notes || ''} onChange={e => setData({ ...data, notes: e.target.value })}
              rows={2}
              placeholder="Client context, constraints, status updates…"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none resize-none transition-colors placeholder-stone-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50/60 rounded-b-[8px] flex-shrink-0">
          <button onClick={onSave} disabled={!isValid}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
            {isEdit ? 'Save Changes' : 'Create Project'}
          </button>
          <button onClick={onCancel}
            className="px-6 py-2.5 border border-stone-200 rounded-[5px] text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
