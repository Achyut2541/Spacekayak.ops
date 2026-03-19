// ═══════════════════════════════════════════════════════════════════════════
// Crisis Library + Communication Templates
// ═══════════════════════════════════════════════════════════════════════════

export const CRISIS_LIB = {
  people: {
    name: 'People Crises',
    scenarios: [
      { id: 'p1', name: 'Key Designer Unavailable (Shubham / Navaneeth / Aditi)', severity: 'critical', playbook: ['Assess which projects are deadline-immovable', 'If Shubham out → Navaneeth takes over + loop Paul', 'If Navaneeth out → Shubham takes L2 role', 'If Aditi out → CRITICAL: Shubham + Navaneeth split work', 'Client comms within 2 hours', 'Deploy Boris or Arina if available'], commsKey: 'medical' },
      { id: 'p2', name: 'Boris Triple-Booked', severity: 'high', playbook: ['Triage: Which project is hardest deadline?', 'Activate Ashwin for 1-2 projects', 'External Webflow agency for the rest ($3-5K)', 'Stagger delivery over 3 weeks not 1'], commsKey: 'capacity' },
      { id: 'p3', name: 'Illustration Bottleneck (All 3 Booked)', severity: 'high', playbook: ['Shift illustration phase by 3-5 days if client allows', 'Deploy external illustrator with internal art direction ($500-1K)', 'Stock assets + heavy customisation as fallback'], commsKey: 'capacity' },
      { id: 'p4', name: 'AM Overload (5+ Projects)', severity: 'high', playbook: ['Triage by urgency and relationship value', 'Redistribute 1-2 projects to another AM', 'Shubham covers top-priority client comms', 'If chronic: hire within 30 days'] },
      { id: 'p5', name: 'Team Member Resignation Mid-Project', severity: 'critical', playbook: ['Document ALL work within 48 hours', 'Map projects to remaining team by skill', 'Proactive client intro to new point person', 'Knowledge transfer: 1hr session per project', 'Hire within 30-45 days'] },
    ],
  },
  project: {
    name: 'Project Execution',
    scenarios: [
      { id: 'pr1', name: 'Daily Scope Creep (Death by 1000 Cuts)', severity: 'critical', playbook: ['FREEZE all new requests for 48 hours', 'Calculate cumulative hours added so far', 'Present options: original scope OR +$4K +12 days', 'Implement formal change order process immediately', 'AM rule going forward: "Add to Phase 2 backlog"'], commsKey: 'scope' },
      { id: 'pr2', name: 'Multiplier Explosion (1 Page → 5 Pages)', severity: 'critical', playbook: ['Emergency stop: pause work, call client today', 'Quantify clearly: "1 page = $5K. 5 pages = $18K + 30 days"', 'Present 3 paths: Phase 2, template approach, reprice', 'Non-negotiable: cannot deliver 5 for the price of 1'], commsKey: 'scope' },
      { id: 'pr3', name: 'Midpoint Realisation: Timeline Impossible', severity: 'critical', playbook: ['Calculate gap precisely (e.g. need 80hrs, have 40hrs)', 'Option A: Extend 1 week — preferred, $0 cost', 'Option B: External resources — original date, +$3K', 'Option C: Reduce scope — agree what gets cut', 'Communicate to client TODAY — earlier = more goodwill'], commsKey: 'capacity' },
      { id: 'pr4', name: 'Client Rejects Design at Week 3 of 4', severity: 'high', playbook: ['Understand specifically what is not working', 'Check contract: how many concepts/revisions included?', 'Present 2-3 new directions (quick sketches) before executing', 'Get ALL stakeholders aligned before pivoting', 'Extend timeline 1.5 weeks minimum'] },
      { id: 'pr5', name: 'Client Content 2 Weeks Late', severity: 'high', playbook: ['Document delay with email trail', 'New deadline = original + days of delay (non-negotiable)', 'Do not compress your team timeline to absorb their delay', 'Options: accept new date OR launch with placeholders'], commsKey: 'capacity' },
    ],
  },
  resource: {
    name: 'Resource & Capacity',
    scenarios: [
      { id: 'r1', name: 'Vendor Ghost (External Disappears Mid-Project)', severity: 'critical', playbook: ['Assume they are gone — do not wait', 'Internal takeover or backup vendor immediately', 'Add 5-10 days to timeline', 'Transparent client communication', 'Do not pay for incomplete work'] },
      { id: 'r2', name: 'Multiple Projects Need Same Specialist Same Week', severity: 'critical', playbook: ['Triage by urgency + client relationship value', 'Time-slice: 2 days per project spread over 6 days', 'Deploy alternative team members where possible', 'Adjust timelines on least critical project', 'Proactive comms to ALL affected clients'] },
      { id: 'r3', name: 'No AM Available for New Project', severity: 'high', playbook: ['Delay start: "Kickoff in 2 weeks for proper bandwidth"', 'Temporary: Shubham manages until AM frees up', 'External PM for complex projects ($3K/month)', 'If chronic: hire AM within 30 days'] },
    ],
  },
  client: {
    name: 'Client Relations',
    scenarios: [
      { id: 'c1', name: 'Client CEO Changes Mid-Project', severity: 'critical', playbook: ['Immediate re-alignment meeting with new stakeholder', 'Present work-to-date with full rationale', 'Get new stakeholder buy-in (they need to own it)', 'Budget for rework — expect direction changes', 'Document all new approvals in writing'] },
      { id: 'c2', name: 'Client Threatening to Leave', severity: 'critical', playbook: ['Escalate to Paul IMMEDIATELY', 'Emergency call: Paul + Shubham + AM today', 'Listen fully — do not defend, acknowledge', 'Present specific recovery plan with dates', 'Consider: partial refund, scope add, or timeline guarantee'], commsKey: 'escalation' },
      { id: 'c3', name: 'Payment 60+ Days Overdue', severity: 'critical', playbook: ['PAUSE all work until payment is received', 'Escalate to their finance and AP team', 'Paul: founder-to-founder call', 'Offer payment plan if client is genuinely struggling', 'Legal letter if >90 days'] },
      { id: 'c4', name: 'Conflicting Feedback from Multiple Stakeholders', severity: 'high', playbook: ['Identify who has final decision-making authority', 'Require consolidated feedback: "One voice, please"', 'Surface the conflict explicitly: "A wants X, B wants Y — which?"', '"We proceed with [our recommendation] unless we hear otherwise by [date]"'] },
    ],
  },
  financial: {
    name: 'Financial',
    scenarios: [
      { id: 'f1', name: 'Project Over Budget (External Costs)', severity: 'high', playbook: ['STOP deploying externals without Paul approval', 'Calculate exact loss: "We are at -$3K margin"', 'Finish remaining work with internals even if slower', 'Post-mortem: underestimate, scope creep, or planning failure?', 'Next time: extend timeline vs over-deploy externals'] },
      { id: 'f2', name: 'Scope Creep Eroded All Margin', severity: 'high', playbook: ['Stop accepting free additions immediately', 'Quantify: "Original = X hours, current = 2X hours"', 'Finish core scope only — no nice-to-haves', 'Client conversation: "We have absorbed $4K of additions. Future changes require a budget increase."', 'Implement change orders going forward'] },
    ],
  },
};

export const COMMS_TEMPLATES = {
  medical: {
    name: 'Timeline Extension — Medical Emergency',
    subject: 'Project Timeline Update — [Project Name]',
    professional: '[Team member] is experiencing a medical emergency and will be unavailable for [X] days. We are adjusting your delivery by [X] days to protect quality.\n\nNew delivery date: [date]\n\nWe appreciate your understanding and will keep you updated.',
    casual: 'Quick heads up — [team member] has had a medical emergency. We are pushing delivery to [date] to make sure the work is still great. Thanks for understanding!',
    urgent: 'Critical update: [team member] medical emergency. New delivery: [date]. Mitigation actions: [list]. Available to speak immediately if needed.',
  },
  scope: {
    name: 'Scope Creep Intervention',
    subject: 'Important: Project Scope Discussion — [Project Name]',
    professional: 'We have received several requests that expand beyond our original agreement.\n\nOriginal scope: [list]\nRequested additions: [list]\nCumulative expansion: [X]%\n\nWe want to find the best path forward. Options:\n1. Complete original scope — additions move to Phase 2\n2. Expand scope: +$[X] and +[Y] days\n3. Trade-off: add [X], remove [Y]\n\nCan we schedule a 20-min call this week?',
    urgent: 'We need an immediate conversation about scope. Cumulative additions represent a [X]% expansion of the project. We cannot continue without addressing the impact on timeline and budget. Please respond within 24 hours.',
  },
  capacity: {
    name: 'Timeline Adjustment — Capacity',
    subject: 'Project Timeline Adjustment — [Project Name]',
    professional: 'Due to current team capacity across multiple projects, we need to adjust your delivery schedule.\n\nOptions:\n1. Revised timeline: [new date] — no additional cost, maintains quality\n2. Original timeline: we bring in external resources at +$[X]\n\nWe recommend Option 1. Please let us know your preference.',
    casual: 'Quick update — we are juggling a few projects and want to give yours the focused time it deserves. Push to [date], or we can bring in extra help at a small cost. First option is usually better. What do you think?',
  },
  escalation: {
    name: 'Client Escalation — Recovery',
    subject: "Let's Make This Right — [Project Name]",
    professional: 'Thank you for being direct with us. We hear your concerns and take them seriously.\n\nHere is our recovery plan:\n- [Specific action 1] by [date]\n- [Specific action 2] by [date]\n- [Specific action 3] by [date]\n\n[Paul/Shubham] will personally oversee this from here. Can we schedule a call this week to align?',
  },
};
