import { TrendingUp, MessageSquare, AlertTriangle, ChevronRight, Target, X } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { CRISIS_LIB, COMMS_TEMPLATES } from '../../data/crisis';
import TemplateCard from '../modals/TemplateCard';

export default function CrisisView() {
  const {
    crisisContext, setCrisisContext,
    crisisCategory, setCrisisCategory,
    crisisScenario, setCrisisScenario,
    timelineFlex, setTimelineFlex,
    budgetFlex, setBudgetFlex,
    showReco, setShowReco,
    copiedTemplate, setCopiedTemplate,
  } = useUI();

  const { projects, tasksWithStatus, delayedCount, getWorkload, capacityPct, getRecommendation } = useData();

  const reco = showReco ? getRecommendation(crisisCategory, crisisScenario, timelineFlex, budgetFlex) : null;
  const cat = CRISIS_LIB[crisisCategory];

  // Compute at-risk projects for quick-select
  const today = new Date();
  const atRiskProjects = projects.filter(p => {
    if (p.archived || p.phase === 'Complete') return false;
    const daysLeft = Math.ceil((new Date(p.endDate || p.decidedEndDate) - today) / 86400000);
    const hasDelayed = tasksWithStatus.some(t => t.projectId === p.id && t.status === 'delayed');
    return daysLeft < 14 || hasDelayed;
  }).map(p => {
    const daysLeft = Math.ceil((new Date(p.endDate || p.decidedEndDate) - today) / 86400000);
    const delayedTasks = tasksWithStatus.filter(t => t.projectId === p.id && t.status === 'delayed').length;
    return { ...p, daysLeft, delayedTasks };
  }).sort((a, b) => (a.daysLeft - b.daysLeft));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light text-stone-900 font-serif tracking-tight">Crisis Navigator</h2>
        <p className="text-stone-400 mt-1 text-sm font-mono">Select a scenario — recommendations auto-load your live team data</p>
      </div>

      {/* Live context banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-[6px] p-4 flex items-start">
        <TrendingUp className="w-4 h-4 text-indigo-500 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-medium text-indigo-800">Live context: </span>
          <span className="text-indigo-600 font-mono text-xs">
            {projects.length} active projects &middot; {delayedCount} delayed tasks &middot;{' '}
            {getWorkload().filter(m => capacityPct(m) >= 90).map(m => m.name).join(', ') || 'no one'} at capacity
          </span>
        </div>
      </div>

      {/* At-risk projects quick-select */}
      {atRiskProjects.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[6px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-mono font-medium text-amber-700 uppercase tracking-wider">Projects that may need crisis nav</span>
          </div>
          <div className="space-y-1.5">
            {atRiskProjects.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  // Store project context
                  setCrisisContext({ id: p.id, name: p.name, daysLeft: p.daysLeft, delayedTasks: p.delayedTasks });
                  // Smart category: overdue deadline → project execution; capacity crunch → resource
                  const smartCat = p.delayedTasks > 2 ? 'resource' : 'project';
                  setCrisisCategory(smartCat);
                  setCrisisScenario('');
                  setShowReco(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-amber-200 rounded-[5px] hover:border-amber-400 hover:bg-amber-50/60 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.daysLeft < 0 ? 'bg-red-500' : p.daysLeft < 7 ? 'bg-orange-500' : 'bg-amber-400'}`} />
                  <span className="text-sm font-medium text-stone-800 truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {p.delayedTasks > 0 && (
                    <span className="text-xs font-mono text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-[5px]">
                      {p.delayedTasks} delayed
                    </span>
                  )}
                  <span className={`text-xs font-mono font-medium ${p.daysLeft < 0 ? 'text-red-600' : p.daysLeft < 7 ? 'text-orange-600' : 'text-amber-600'}`}>
                    {p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d overdue` : `${p.daysLeft}d left`}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-amber-600 font-mono mt-2 opacity-70">Select a project above, then choose a crisis scenario below</p>
        </div>
      )}

      {/* Scenario picker */}
      <div className="bg-white border border-stone-200 rounded-[6px] p-6 space-y-5">

        {/* Active project context */}
        {crisisContext && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-[5px] px-3 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Target className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-mono text-amber-500 uppercase tracking-wider">Planning for</span>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-sm font-semibold text-stone-800 truncate">{crisisContext.name}</span>
                  <span className={`text-xs font-mono font-medium ${crisisContext.daysLeft < 0 ? 'text-red-600' : crisisContext.daysLeft < 7 ? 'text-orange-600' : 'text-amber-600'}`}>
                    {crisisContext.daysLeft < 0 ? `${Math.abs(crisisContext.daysLeft)}d overdue` : `${crisisContext.daysLeft}d left`}
                  </span>
                  {crisisContext.delayedTasks > 0 && (
                    <span className="text-xs font-mono text-red-600">{crisisContext.delayedTasks} delayed task{crisisContext.delayedTasks > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setCrisisContext(null)} className="p-1 hover:bg-amber-100 rounded transition-colors flex-shrink-0 ml-2">
              <X className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Crisis Category</label>
          <select
            value={crisisCategory}
            onChange={e => { setCrisisCategory(e.target.value); setCrisisScenario(''); setShowReco(false); }}
            className="w-full px-3 py-2.5 border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none text-sm"
          >
            <option value="">Select category...</option>
            {Object.entries(CRISIS_LIB).map(([k, v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
          </select>
        </div>

        {crisisCategory && cat && (
          <div>
            <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Specific Scenario</label>
            <div className="space-y-2">
              {cat.scenarios.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setCrisisScenario(s.id); setShowReco(false); }}
                  className={`w-full text-left px-4 py-3 rounded-[5px] border transition-all ${
                    crisisScenario === s.id ? 'border-indigo-400 bg-indigo-50' : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-800 text-sm">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                      s.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {s.severity.toUpperCase()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {crisisScenario && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Timeline Flexibility: {timelineFlex}%</label>
              <input type="range" min="0" max="100" value={timelineFlex} onChange={e => setTimelineFlex(+e.target.value)} className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-stone-400 font-mono mt-1"><span>Deadline fixed</span><span>Very flexible</span></div>
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1.5">Budget Flexibility: {budgetFlex}%</label>
              <input type="range" min="0" max="100" value={budgetFlex} onChange={e => setBudgetFlex(+e.target.value)} className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-stone-400 font-mono mt-1"><span>No budget</span><span>Can spend more</span></div>
            </div>
          </div>
        )}

        {crisisScenario && (
          <button
            onClick={() => setShowReco(true)}
            className="w-full bg-red-600 text-white py-3 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 transition-opacity"
          >
            Generate Action Plan
          </button>
        )}
      </div>

      {/* Recommendation */}
      {reco && (
        <div className="bg-white border border-indigo-300 rounded-[6px] overflow-hidden">
          <div className="bg-indigo-600 text-white px-6 py-4">
            <div className="text-xs font-mono opacity-75 mb-1 uppercase tracking-wider">Crisis Scenario</div>
            <div className="text-lg font-light font-serif">{reco.scenario}</div>
          </div>
          <div className="p-6 space-y-5">
            <div className="bg-indigo-50 border border-indigo-100 rounded-[5px] p-4">
              <div className="text-xs font-mono font-medium text-indigo-500 uppercase tracking-wider mb-1">Recommended Action</div>
              <div className="text-base font-medium text-stone-900">{reco.primaryAction}</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-indigo-50 rounded-[5px] p-4 border border-indigo-100">
                <div className="text-xs font-mono text-stone-400 uppercase tracking-wider mb-1">Timeline Impact</div>
                <div className="text-xl font-light font-serif text-stone-900">{reco.tlImpact}</div>
              </div>
              <div className="bg-orange-50 rounded-[5px] p-4 border border-orange-100">
                <div className="text-xs font-mono text-stone-400 uppercase tracking-wider mb-1">Cost Impact</div>
                <div className="text-xl font-light font-serif text-stone-900">{reco.costImpact}</div>
              </div>
              <div className="bg-purple-50 rounded-[5px] p-4 border border-purple-100">
                <div className="text-xs font-mono text-stone-400 uppercase tracking-wider mb-1">Team Context</div>
                <div className="text-sm font-medium text-stone-800">
                  {reco.overloaded.length > 0 ? `${reco.overloaded.join(', ')} at limit` : 'Team has capacity'}
                </div>
              </div>
            </div>

            {reco.overloaded.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-[5px] p-3 text-sm">
                <span className="font-medium text-red-700">Team conflict: </span>
                <span className="text-red-600 font-mono text-xs">{reco.overloaded.join(', ')} are already at capacity. Do not assign more work without rebalancing.</span>
              </div>
            )}
            {reco.available.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-[5px] p-3 text-sm">
                <span className="font-medium text-green-700">Available capacity: </span>
                <span className="text-green-600 font-mono text-xs">{reco.available.join(', ')} have headroom and could absorb work.</span>
              </div>
            )}

            <div>
              <div className="text-xs font-mono font-medium text-stone-400 uppercase tracking-wider mb-3">Action Playbook</div>
              <div className="space-y-2">
                {reco.playbook.map((step, i) => (
                  <div key={i} className="flex items-start">
                    <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-mono font-medium mr-3 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-stone-600 text-sm pt-0.5">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {reco.commsKey && COMMS_TEMPLATES[reco.commsKey] && (
              <button
                onClick={() => setCopiedTemplate(reco.commsKey)}
                className="w-full border border-indigo-400 text-indigo-600 py-2.5 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:bg-indigo-50 flex items-center justify-center transition-colors"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Use &ldquo;{COMMS_TEMPLATES[reco.commsKey].name}&rdquo; Template
              </button>
            )}
          </div>
        </div>
      )}

      {copiedTemplate && COMMS_TEMPLATES[copiedTemplate] && (
        <TemplateCard template={COMMS_TEMPLATES[copiedTemplate]} onClose={() => setCopiedTemplate(null)} />
      )}
    </div>
  );
}
