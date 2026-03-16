// ═══════════════════════════════════════════════════════════════════════════
// Seed Data — Default team, projects, tasks (used when DB is empty)
// ═══════════════════════════════════════════════════════════════════════════

import { dateOffset } from '../lib/utils';

export const SEED_TEAM = [
  { id: 'tm-1',  name: 'Shubham',     email: 'shubham@spacekayak.xyz',   role: 'Head of Design',    type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-2',  name: 'Navaneeth',   email: 'navaneeth@spacekayak.xyz', role: 'ACD',               type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-3',  name: 'Aditi',       email: 'aditi@spacekayak.xyz',     role: 'Brand Designer',    type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-4',  name: 'Gayatri',     email: 'gayatri@spacekayak.xyz',   role: 'Illustrator',       type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-5',  name: 'Urja',        email: 'urja@spacekayak.xyz',      role: 'Illustrator',       type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-6',  name: 'Ashwin',      email: 'ashwin@spacekayak.xyz',    role: 'Web Designer',      type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-7',  name: 'Boris',       email: 'boris@spacekayak.xyz',     role: 'Web (Extended)',     type: 'design', maxProjects: 1, sysRole: 'team_member', active: true },
  { id: 'tm-8',  name: 'Arina',       email: 'arina@spacekayak.xyz',     role: 'Illus. (Extended)',  type: 'design', maxProjects: 1, sysRole: 'team_member', active: true },
  { id: 'tm-9',  name: 'Himanshu',    email: 'himanshu@spacekayak.xyz',  role: 'Developer',         type: 'dev',    maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-10', name: 'Karthick',    email: 'karthick@spacekayak.xyz',  role: 'Developer',         type: 'dev',    maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-11', name: 'Prashant',    email: 'prashant@spacekayak.xyz',  role: 'Developer',         type: 'dev',    maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-12', name: 'Sumit Yadav', email: 'sumit@spacekayak.xyz',     role: 'Developer',         type: 'dev',    maxProjects: 3, sysRole: 'team_member', active: true },
  { id: 'tm-13', name: 'Ayan',        email: 'ayan@spacekayak.xyz',      role: 'Developer',         type: 'dev',    maxProjects: 2, sysRole: 'team_member', active: true },
  { id: 'tm-14', name: 'Achyut',      email: 'pixel@spacekayak.xyz',     role: 'Account Manager',   type: 'am',     maxProjects: 3, sysRole: 'admin',       active: true },
  { id: 'tm-15', name: 'Hari',        email: 'hari@spacekayak.xyz',      role: 'Account Manager',   type: 'am',     maxProjects: 3, sysRole: 'am',          active: true },
  { id: 'tm-16', name: 'Neel',        email: 'neel@spacekayak.xyz',      role: 'Account Manager',   type: 'am',     maxProjects: 3, sysRole: 'am',          active: true },
];

export const SEED_PROJECTS = [
  {
    id: 'proj-1', name: 'Assurekit',
    type: 'Full Rebrand + Multi-page Website', isRetainer: true,
    startDate: dateOffset(-95), endDate: dateOffset(28), decidedEndDate: dateOffset(28),
    phase: 'Development', progress: 75,
    team: { am: 'Achyut', designTeam: ['Boris', 'Navaneeth'], devTeam: ['Sumit Yadav'] },
    notes: 'Branding almost complete, most pages ready, logo pending approval',
    isStartingSoon: false, confirmedStartDate: null, clientDelayDays: 0,
  },
  {
    id: 'proj-2', name: 'Stylumia',
    type: 'Product Design + Website + Branding', isRetainer: false,
    startDate: dateOffset(-112), endDate: dateOffset(70), decidedEndDate: dateOffset(70),
    phase: 'Development', progress: 60,
    team: { am: 'Achyut', designTeam: ['Boris', 'Ashwin'], devTeam: ['Sumit Yadav'] },
    notes: 'Branding done, Trends site live, main landing + hero videos pending',
    isStartingSoon: false, confirmedStartDate: null, clientDelayDays: 0,
  },
  {
    id: 'proj-3', name: 'Sarvam',
    type: 'Video Project', isRetainer: false,
    startDate: dateOffset(-45), endDate: dateOffset(-7), decidedEndDate: dateOffset(-7),
    phase: 'Complete', progress: 100,
    team: { am: 'Neel', designTeam: ['Gayatri', 'Navaneeth', 'Ashwin'], devTeam: [] },
    notes: 'All 5 videos delivered and signed off. Project closed recently.',
    isStartingSoon: false, confirmedStartDate: null, clientDelayDays: 0,
  },
  {
    id: 'proj-4', name: 'F-log',
    type: 'Brand Lite + Website', isRetainer: false,
    startDate: dateOffset(-33), endDate: dateOffset(9), decidedEndDate: dateOffset(9),
    phase: 'Branding', progress: 25,
    team: { am: 'Hari', designTeam: ['Navaneeth', 'Urja'], devTeam: ['Sumit Yadav'] },
    notes: 'Branding in progress, website yet to start',
    isStartingSoon: false, confirmedStartDate: null, clientDelayDays: 0,
  },
];

export const SEED_TASKS = [
  { id: 't1', projectId: 'proj-1', title: 'Logo approval from client', assignedTo: ['Achyut'], dueDate: dateOffset(2), status: 'in-progress', priority: 'high', estimatedHours: 2, actualHours: null, clientDelayDays: 0 },
  { id: 't2', projectId: 'proj-1', title: 'Complete customer page design', assignedTo: ['Boris'], dueDate: dateOffset(3), status: 'in-progress', priority: 'high', estimatedHours: 12, actualHours: null, clientDelayDays: 0 },
  { id: 't3', projectId: 'proj-1', title: 'Finish industry pages', assignedTo: ['Boris'], dueDate: dateOffset(5), status: 'in-progress', priority: 'medium', estimatedHours: 16, actualHours: null, clientDelayDays: 0 },
  { id: 't4', projectId: 'proj-1', title: 'Dev - blogs page', assignedTo: ['Sumit Yadav'], dueDate: dateOffset(4), status: 'in-progress', priority: 'medium', estimatedHours: 8, actualHours: null, clientDelayDays: 0 },
  { id: 't5', projectId: 'proj-1', title: 'QA - Cross-browser testing', assignedTo: ['Achyut'], dueDate: dateOffset(18), status: 'backlog', priority: 'medium', estimatedHours: 4, actualHours: null, clientDelayDays: 0 },
  { id: 't6', projectId: 'proj-2', title: 'Hero video - Main landing', assignedTo: ['Navaneeth'], dueDate: dateOffset(7), status: 'next-in-line', priority: 'high', estimatedHours: 20, actualHours: null, clientDelayDays: 0 },
  { id: 't7', projectId: 'proj-2', title: 'Hero video - Assort site', assignedTo: ['Gayatri'], dueDate: dateOffset(7), status: 'next-in-line', priority: 'high', estimatedHours: 20, actualHours: null, clientDelayDays: 0 },
  { id: 't8', projectId: 'proj-2', title: 'Design main landing page', assignedTo: ['Boris'], dueDate: dateOffset(6), status: 'next-in-line', priority: 'high', estimatedHours: 14, actualHours: null, clientDelayDays: 0 },
  { id: 't9', projectId: 'proj-2', title: 'Dev - Build main landing', assignedTo: ['Sumit Yadav'], dueDate: dateOffset(14), status: 'backlog', priority: 'medium', estimatedHours: 24, actualHours: null, clientDelayDays: 0 },
  { id: 't10', projectId: 'proj-2', title: 'Finalize Assort structure', assignedTo: ['Ashwin'], dueDate: dateOffset(5), status: 'in-progress', priority: 'medium', estimatedHours: 10, actualHours: null, clientDelayDays: 0 },
  { id: 't11', projectId: 'proj-3', title: 'Video 4 - Animation + delivery', assignedTo: ['Navaneeth'], dueDate: dateOffset(-10), status: 'completed', priority: 'critical', manualStatus: true, estimatedHours: 24, actualHours: 26, clientDelayDays: 0 },
  { id: 't12', projectId: 'proj-3', title: 'Video 5 - Animation + delivery', assignedTo: ['Gayatri'], dueDate: dateOffset(-10), status: 'completed', priority: 'critical', manualStatus: true, estimatedHours: 24, actualHours: 22, clientDelayDays: 0 },
  { id: 't13', projectId: 'proj-3', title: 'Client review & revisions', assignedTo: ['Neel'], dueDate: dateOffset(-7), status: 'completed', priority: 'high', manualStatus: true, estimatedHours: 6, actualHours: 8, clientDelayDays: 0 },
  { id: 't14', projectId: 'proj-4', title: 'Branding concept presentation', assignedTo: ['Navaneeth'], dueDate: dateOffset(1), status: 'in-progress', priority: 'high', estimatedHours: 18, actualHours: null, clientDelayDays: 0 },
  { id: 't15', projectId: 'proj-4', title: 'Custom illustration work', assignedTo: ['Urja'], dueDate: dateOffset(4), status: 'next-in-line', priority: 'medium', estimatedHours: 12, actualHours: null, clientDelayDays: 0 },
  { id: 't16', projectId: 'proj-4', title: 'Website wireframes', assignedTo: ['Navaneeth'], dueDate: dateOffset(9), status: 'backlog', priority: 'medium', estimatedHours: 10, actualHours: null, clientDelayDays: 0 },
  { id: 't17', projectId: 'proj-4', title: 'Website development', assignedTo: ['Sumit Yadav'], dueDate: dateOffset(18), status: 'backlog', priority: 'low', estimatedHours: 32, actualHours: null, clientDelayDays: 0 },
];

export const SEED_HISTORICAL = {
  completedProjects: [],
  taskAccuracy: {},
  teamVelocity: {},
  commonDelays: [],
  riskPatterns: [],
};
