import { TrendingUp, MessageSquare } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { CRISIS_LIB, COMMS_TEMPLATES } from '../../data/crisis';
import TemplateCard from '../modals/TemplateCard';

export default function CrisisView() {
  const {
    crisisCategory, setCrisisCategory,
    crisisScenario, setCrisisScenario,
    timelineFlex, setTimelineFlex,
    budgetFlex, setBudgetFlex,
    showReco, setShowReco,
    copiedTemplate, setCopiedTemplate,
  } = useUI();

  const { projects, delayedCount, getWorkload, capacityPct, getRecommendation } = useData();

  const reco = showReco ? getRecommendation(crisisCategory, crisisScenario, timelineFlex, budgetFlex) : null;
  const cat = CRISIS_LIB[crisisCategory];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light text-gray-900 font-serif tracking-tight">Crisis Navigator</h2>
        <p className="text-gray-500 mt-1">Select a scenario — recommendations auto-load your live team data</p>
      </div>

      {/* Live context banner */}
      <div className="bg-teal-50 border-2 border-teal-300 rounded-xl p-4 flex items-start">
        <TrendingUp className="w-5 h-5 text-teal-600 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-bold text-teal-800">Live context loaded: </span>
          <span className="text-teal-700">
            {projects.length} active projects &middot; {delayedCount} delayed tasks &middot;{' '}
            {getWorkload().filter(m => capacityPct(m) >= 90).map(m => m.name).join(', ') || 'no one'} at capacity
          </span>
        </div>
      </div>

      {/* Scenario picker */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-bold mb-2">Crisis Category</label>
          <select
            value={crisisCategory}
            onChange={e => { setCrisisCategory(e.target.value); setCrisisScenario(''); setShowReco(false); }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
          >
            <option value="">Select category...</option>
            {Object.entries(CRISIS_LIB).map(([k, v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
          </select>
        </div>

        {crisisCategory && cat && (
          <div>
            <label className="block text-sm font-bold mb-2">Specific Scenario</label>
            <div className="space-y-2">
              {cat.scenarios.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setCrisisScenario(s.id); setShowReco(false); }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    crisisScenario === s.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
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
              <label className="block text-sm font-bold mb-2">Timeline Flexibility: {timelineFlex}%</label>
              <input type="range" min="0" max="100" value={timelineFlex} onChange={e => setTimelineFlex(+e.target.value)} className="w-full" />
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>Deadline fixed</span><span>Very flexible</span></div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Budget Flexibility: {budgetFlex}%</label>
              <input type="range" min="0" max="100" value={budgetFlex} onChange={e => setBudgetFlex(+e.target.value)} className="w-full" />
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>No budget</span><span>Can spend more</span></div>
            </div>
          </div>
        )}

        {crisisScenario && (
          <button
            onClick={() => setShowReco(true)}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors"
          >
            Generate Action Plan
          </button>
        )}
      </div>

      {/* Recommendation */}
      {reco && (
        <div className="bg-white rounded-xl border-2 border-teal-500 shadow-lg overflow-hidden">
          <div className="bg-teal-600 text-white px-6 py-4">
            <div className="text-xs font-bold opacity-75 mb-1">CRISIS SCENARIO</div>
            <div className="text-lg font-bold">{reco.scenario}</div>
          </div>
          <div className="p-6 space-y-5">
            <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4">
              <div className="text-xs font-bold text-teal-600 mb-1">RECOMMENDED ACTION</div>
              <div className="text-lg font-bold text-gray-900">{reco.primaryAction}</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                <div className="text-xs font-bold text-gray-500 mb-1">TIMELINE IMPACT</div>
                <div className="text-xl font-black">{reco.tlImpact}</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="text-xs font-bold text-gray-500 mb-1">COST IMPACT</div>
                <div className="text-xl font-black">{reco.costImpact}</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="text-xs font-bold text-gray-500 mb-1">TEAM CONTEXT</div>
                <div className="text-sm font-bold">
                  {reco.overloaded.length > 0 ? `${reco.overloaded.join(', ')} at limit` : 'Team has capacity'}
                </div>
              </div>
            </div>

            {reco.overloaded.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                <span className="font-bold text-red-700">Team conflict: </span>
                <span className="text-red-600">{reco.overloaded.join(', ')} are already at capacity. Do not assign more work without rebalancing.</span>
              </div>
            )}
            {reco.available.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <span className="font-bold text-green-700">Available capacity: </span>
                <span className="text-green-600">{reco.available.join(', ')} have headroom and could absorb work.</span>
              </div>
            )}

            <div>
              <div className="text-sm font-bold text-gray-700 mb-3">ACTION PLAYBOOK</div>
              <div className="space-y-2">
                {reco.playbook.map((step, i) => (
                  <div key={i} className="flex items-start">
                    <span className="bg-teal-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">{i + 1}</span>
                    <span className="text-gray-700 text-sm pt-1">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {reco.commsKey && COMMS_TEMPLATES[reco.commsKey] && (
              <button
                onClick={() => setCopiedTemplate(reco.commsKey)}
                className="w-full border-2 border-teal-500 text-teal-700 py-3 rounded-lg font-bold hover:bg-teal-50 flex items-center justify-center transition-colors"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
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
