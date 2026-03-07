import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertTriangle, Users, DollarSign, MessageSquare, X, Copy, Check, AlertCircle, TrendingUp, Clock, Target, Plus, Edit2, Trash2, CheckCircle, Circle, PlayCircle, List, ChevronDown, Calendar, Home, LayoutDashboard } from 'lucide-react';

// Supabase setup
const SUPABASE_URL = 'https://prkexjgmqdpeoifznjpv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBya2V4amdtcWRwZW9pZnpuanB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzOTQzNzMsImV4cCI6MjA4Njk3MDM3M30.1ur3I23OgoiVBfHKN-yJuczF1zrv6VMiL_AMlLjPIpQ';

// ── Slack Notifications ───────────────────────────────────────────────────
// Paste your Slack incoming webhook URL here once you've created the channel.
// Format: https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/xxxxxxxxxxxxxxxxxxxxxxxx
// Leave blank to disable — all notification calls silently no-op when empty.
const SLACK_WEBHOOK_URL = ''; // TODO: add your webhook URL

const sendSlackNotification = async (payload) => {
  if (!SLACK_WEBHOOK_URL) return null; // Not configured yet — skip silently
  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok ? 'sent' : 'error';
  } catch (_) {
    return 'error';
  }
};

// Block Kit payload — task assigned / reassigned
const buildTaskAssignedPayload = ({ task, projectName, assignees, assignedBy, isReassign = false }) => {
  const priorityEmoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' }[task.priority] || '⚪';
  const priorityLabel = task.priority
    ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
    : 'Medium';
  const dueLabel = task.dueDate
    ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'No due date';
  const headerText = isReassign
    ? `🔄 Task Reassigned — ${projectName}`
    : `📋 Task Assigned — ${projectName}`;

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: headerText, emoji: true }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${task.title}*` }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Assigned to*\n${assignees.join(', ')}` },
          { type: 'mrkdwn', text: `*Due*\n${dueLabel}` },
          { type: 'mrkdwn', text: `*Priority*\n${priorityEmoji} ${priorityLabel}` },
          { type: 'mrkdwn', text: `*Assigned by*\n${assignedBy}` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `SpaceKayak Operations · ${new Date().toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            })}`
          }
        ]
      },
      { type: 'divider' }
    ]
  };
};

// Block Kit payload — task marked delayed
const buildTaskDelayedPayload = ({ task, projectName, daysDelayed }) => {
  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo].filter(Boolean);
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `⚠️ Task Overdue — ${projectName}`, emoji: true }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${task.title}*` }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Assigned to*\n${assignees.join(', ')}` },
          { type: 'mrkdwn', text: `*Overdue by*\n${daysDelayed} day${daysDelayed !== 1 ? 's' : ''}` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `SpaceKayak Operations · ${new Date().toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            })}`
          }
        ]
      },
      { type: 'divider' }
    ]
  };
};

// Date helper — returns YYYY-MM-DD relative to today
const _d = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

// Auth helpers (Supabase Auth REST)
const supabaseAuth = {
  signIn: async (email, password) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: data.error_description || data.msg || 'Login failed' };
      return { data, error: null };
    } catch (err) {
      return { data: null, error: 'Network error — could not reach auth server' };
    }
  },
  signOut: async (token) => {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
      });
    } catch (_) {}
  },
  getUser: async (token) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }
};

// Minimal Supabase client
const supabase = {
  from: (table) => ({
    select: () => ({
      then: async (resolve) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const data = res.ok ? await res.json() : [];
        resolve({ data, error: res.ok ? null : 'Error loading' });
      }
    }),
    upsert: (record) => ({
      select: () => ({
        then: async (resolve) => {
          await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: { 
              'apikey': SUPABASE_KEY, 
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation,resolution=merge-duplicates'
            },
            body: JSON.stringify(record)
          });
          resolve({ data: [record], error: null });
        }
      })
    }),
    delete: () => ({
      eq: (col, val) => ({
        then: async (resolve) => {
          await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          resolve({ error: null });
        }
      })
    })
  })
};

const SpaceKayakOpsCenter = function() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Profile & User Management
  const [currentUser, setCurrentUser] = useState('Achyut'); // Admin by default
  const [viewingAs, setViewingAs] = useState(null); // For "View As" feature
  
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByPerson, setFilterByPerson] = useState('');
  
  // Project Archival
  const [showArchived, setShowArchived] = useState(false);
  
  // Dashboard View Options
  const [expandedProjects, setExpandedProjects] = useState([]); // Which projects are expanded (array of IDs)
  const [dashboardView, setDashboardView] = useState('cards'); // 'cards' or 'table'
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [crisisCategory, setCrisisCategory] = useState('');
  const [crisisScenario, setCrisisScenario] = useState('');
  const [timelineFlex, setTimelineFlex] = useState(50);
  const [budgetFlex, setBudgetFlex] = useState(50);
  const [showReco, setShowReco] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(null);
  const [capacityFilter, setCapacityFilter] = useState('all');
  const [expandedMember, setExpandedMember] = useState(null);
  const [reassigningTask, setReassigningTask] = useState(null);
  const [weekView, setWeekView] = useState('this-week'); // 'this-week' | 'next-week'
  const [loggingHoursTask, setLoggingHoursTask] = useState(null);
  const [loggedHours, setLoggedHours] = useState('');
  const [clientDelayTask, setClientDelayTask] = useState(null);
  const [clientDelayDays, setClientDelayDays] = useState('');
  const [workloadWarning, setWorkloadWarning] = useState(null); // { taskId, personName, warningData }

  // ── Slack toast feedback ──────────────────────────────────────────────────
  const [slackToast, setSlackToast] = useState(null); // null | 'sent' | 'error'
  const slackToastTimer = useRef(null);
  const triggerSlackToast = (status) => {
    setSlackToast(status);
    if (slackToastTimer.current) clearTimeout(slackToastTimer.current);
    slackToastTimer.current = setTimeout(() => setSlackToast(null), 3000);
  };

  // ── Authentication state ──────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState(null);
  const [authEmail, setAuthEmail] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false); // true once we've checked localStorage
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const phases = ['Kickoff', 'Discovery', 'Strategy', 'Branding', 'Design', 'Development', 'QA', 'Final Delivery', 'Complete'];

  // ── Team Members as State ── editable, add/remove/deactivate at runtime
  const [teamMembers, setTeamMembers] = useState([
    { id: 'tm-1',  name: 'Shubham',     email: 'shubham@spacekayak.xyz',     role: 'Head of Design',    type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-2',  name: 'Navaneeth',   email: 'navaneeth@spacekayak.xyz',   role: 'ACD',               type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-3',  name: 'Aditi',       email: 'aditi@spacekayak.xyz',       role: 'Brand Designer',    type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-4',  name: 'Gayatri',     email: 'gayatri@spacekayak.xyz',     role: 'Illustrator',       type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-5',  name: 'Urja',        email: 'urja@spacekayak.xyz',        role: 'Illustrator',       type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-6',  name: 'Ashwin',      email: 'ashwin@spacekayak.xyz',      role: 'Web Designer',      type: 'design', maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-7',  name: 'Boris',       email: 'boris@spacekayak.xyz',       role: 'Web (Extended)',    type: 'design', maxProjects: 1, sysRole: 'team_member', active: true },
    { id: 'tm-8',  name: 'Arina',       email: 'arina@spacekayak.xyz',       role: 'Illus. (Extended)', type: 'design', maxProjects: 1, sysRole: 'team_member', active: true },
    { id: 'tm-9',  name: 'Himanshu',    email: 'himanshu@spacekayak.xyz',    role: 'Developer',         type: 'dev',    maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-10', name: 'Karthick',    email: 'karthick@spacekayak.xyz',    role: 'Developer',         type: 'dev',    maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-11', name: 'Prashant',    email: 'prashant@spacekayak.xyz',    role: 'Developer',         type: 'dev',    maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-12', name: 'Sumit Yadav', email: 'sumit@spacekayak.xyz',       role: 'Developer',         type: 'dev',    maxProjects: 3, sysRole: 'team_member', active: true },
    { id: 'tm-13', name: 'Ayan',        email: 'ayan@spacekayak.xyz',        role: 'Developer',         type: 'dev',    maxProjects: 2, sysRole: 'team_member', active: true },
    { id: 'tm-14', name: 'Achyut',      email: 'pixel@spacekayak.xyz',       role: 'Account Manager',   type: 'am',     maxProjects: 3, sysRole: 'admin',       active: true },
    { id: 'tm-15', name: 'Hari',        email: 'hari@spacekayak.xyz',        role: 'Account Manager',   type: 'am',     maxProjects: 3, sysRole: 'am',          active: true },
    { id: 'tm-16', name: 'Neel',        email: 'neel@spacekayak.xyz',        role: 'Account Manager',   type: 'am',     maxProjects: 3, sysRole: 'am',          active: true },
  ]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newMember, setNewMember] = useState({ name: '', role: '', type: 'design', maxProjects: 2, sysRole: 'team_member' });

  // Derived team arrays — always in sync with teamMembers state
  const activeMembers = teamMembers.filter(function(m) { return m.active !== false; });
  const designTeam = activeMembers.filter(function(m) { return m.type === 'design'; }).map(function(m) { return m.name; });
  const devTeam = activeMembers.filter(function(m) { return m.type === 'dev'; }).map(function(m) { return m.name; });
  const accountManagers = activeMembers.filter(function(m) { return m.type === 'am'; }).map(function(m) { return m.name; });
  const allTeamMembers = activeMembers.map(function(m) { return m.name; });

  // Derived role maps
  const userRoles = Object.fromEntries([
    ...activeMembers.map(function(m) { return [m.name, m.sysRole || 'team_member']; }),
    ['Paul', 'leadership'],
    ['Saaket', 'leadership'],
  ]);
  const teamRoles = Object.fromEntries(
    activeMembers.map(function(m) { return [m.name, { role: m.role, type: m.type, maxProjects: m.maxProjects }]; })
  );

  const getUserRole = function(userName) {
    return userRoles[userName] || 'team_member';
  };

  const canEditProjects = function(userName) {
    const role = getUserRole(userName);
    return role === 'admin' || role === 'am';
  };

  const canViewAllProjects = function(userName) {
    const role = getUserRole(userName);
    return role === 'admin' || role === 'am' || role === 'leadership';
  };

  const canViewAs = function(userName) {
    const role = getUserRole(userName);
    return role === 'admin' || role === 'am';
  };

  // Priority weights: how much load each task type contributes
  const projectTypes = ['Brand Lite', 'Full Rebrand', 'Video Project', 'Landing Page', 'Full Website', 'Brand + Website', 'Pitch Deck', 'Product Design', 'Other'];

  // Project templates - auto-create tasks based on project type
  const projectTemplates = {
    'Brand Lite': [
      { title: 'Brand workshop', priority: 'high', estimatedHours: 8, order: 1 },
      { title: 'Lookbook', priority: 'high', estimatedHours: 12, order: 2 },
      { title: 'Stylescapes', priority: 'medium', estimatedHours: 16, order: 3 },
      { title: 'Final brand presentation', priority: 'high', estimatedHours: 8, order: 4 },
      { title: 'Brand files handover', priority: 'medium', estimatedHours: 4, order: 5 }
    ],
    'Full Rebrand': [
      { title: 'Brand workshop', priority: 'critical', estimatedHours: 8, order: 1 },
      { title: 'Brand synthesis', priority: 'high', estimatedHours: 12, order: 2 },
      { title: 'Lookbook', priority: 'high', estimatedHours: 16, order: 3 },
      { title: 'Stylescapes', priority: 'high', estimatedHours: 20, order: 4 },
      { title: 'Logo drafts', priority: 'critical', estimatedHours: 24, order: 5 },
      { title: 'Collaterals design', priority: 'medium', estimatedHours: 16, order: 6 },
      { title: 'Brand presentation', priority: 'high', estimatedHours: 12, order: 7 },
      { title: 'Final brand book', priority: 'high', estimatedHours: 16, order: 8 }
    ],
    'Landing Page': [
      { title: 'Information Architecture (IA)', priority: 'high', estimatedHours: 8, order: 1 },
      { title: 'Wireframes', priority: 'high', estimatedHours: 8, order: 2 },
      { title: 'Hi-fi design', priority: 'critical', estimatedHours: 20, order: 3 },
      { title: 'Development', priority: 'critical', estimatedHours: 24, order: 4 },
      { title: 'QA & testing', priority: 'high', estimatedHours: 8, order: 5 },
      { title: 'Fixes & polish', priority: 'high', estimatedHours: 6, order: 6 },
      { title: 'Final handover', priority: 'medium', estimatedHours: 4, order: 7 }
    ],
    'Full Website': [
      { title: 'Information Architecture (IA)', priority: 'critical', estimatedHours: 16, order: 1 },
      { title: 'Wireframes - Homepage', priority: 'critical', estimatedHours: 12, order: 2 },
      { title: 'Wireframes - Product page', priority: 'high', estimatedHours: 10, order: 3 },
      { title: 'Wireframes - About us', priority: 'medium', estimatedHours: 8, order: 4 },
      { title: 'Wireframes - Solutions', priority: 'high', estimatedHours: 10, order: 5 },
      { title: 'Wireframes - Case studies', priority: 'medium', estimatedHours: 8, order: 6 },
      { title: 'Wireframes - Blog & Careers', priority: 'low', estimatedHours: 6, order: 7 },
      { title: 'Wireframes - Contact us', priority: 'low', estimatedHours: 4, order: 8 },
      { title: 'Hi-fi design - Homepage', priority: 'critical', estimatedHours: 24, order: 9 },
      { title: 'Hi-fi design - Product page', priority: 'high', estimatedHours: 20, order: 10 },
      { title: 'Hi-fi design - About us', priority: 'medium', estimatedHours: 16, order: 11 },
      { title: 'Hi-fi design - Solutions', priority: 'high', estimatedHours: 20, order: 12 },
      { title: 'Hi-fi design - Case studies', priority: 'medium', estimatedHours: 18, order: 13 },
      { title: 'Hi-fi design - Blog & Careers', priority: 'low', estimatedHours: 14, order: 14 },
      { title: 'Hi-fi design - Contact us', priority: 'low', estimatedHours: 10, order: 15 },
      { title: 'Development - Homepage', priority: 'critical', estimatedHours: 32, order: 16 },
      { title: 'Development - Product page', priority: 'high', estimatedHours: 28, order: 17 },
      { title: 'Development - About & Solutions', priority: 'high', estimatedHours: 24, order: 18 },
      { title: 'Development - Case studies', priority: 'medium', estimatedHours: 24, order: 19 },
      { title: 'Development - Blog & Careers', priority: 'medium', estimatedHours: 20, order: 20 },
      { title: 'Development - Contact form & integration', priority: 'medium', estimatedHours: 16, order: 21 },
      { title: 'QA - Cross-browser testing', priority: 'high', estimatedHours: 16, order: 22 },
      { title: 'QA - Mobile responsiveness', priority: 'high', estimatedHours: 12, order: 23 },
      { title: 'QA - Performance optimization', priority: 'medium', estimatedHours: 10, order: 24 },
      { title: 'Fixes & polish', priority: 'high', estimatedHours: 16, order: 25 },
      { title: 'Final handover & documentation', priority: 'high', estimatedHours: 8, order: 26 }
    ]
  };

  const taskStatuses = [
    { value: 'backlog',       label: 'Backlog',       color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { value: 'next-in-line',  label: 'Next in Line',  color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { value: 'in-progress',   label: 'In Progress',   color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'for-review',    label: 'For Review',    color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
    { value: 'client-delay',  label: 'Client Delay',  color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: 'delayed',       label: 'Delayed',       color: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'completed',     label: 'Completed',     color: 'bg-green-100 text-green-700 border-green-300' },
  ];

  const priorities = [
    { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-50' },
    { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'low', label: 'Low', color: 'text-gray-600 bg-gray-50' },
  ];

  const [projects, setProjects] = useState([
    {
      id: 'proj-1', name: 'Assurekit',
      type: 'Full Rebrand + Multi-page Website', isRetainer: true,
      startDate: _d(-95), endDate: _d(28), decidedEndDate: _d(28),
      phase: 'Development', progress: 75,
      team: { am: 'Achyut', designTeam: ['Boris', 'Navaneeth'], devTeam: ['Sumit Yadav'] },
      notes: 'Branding almost complete, most pages ready, logo pending approval',
      isStartingSoon: false, confirmedStartDate: null, clientDelayDays: 0
    },
    {
      id: 'proj-2', name: 'Stylumia',
      type: 'Product Design + Website + Branding', isRetainer: false,
      startDate: _d(-112), endDate: _d(70), decidedEndDate: _d(70),
      phase: 'Development', progress: 60,
      team: { am: 'Achyut', designTeam: ['Boris', 'Ashwin'], devTeam: ['Sumit Yadav'] },
      notes: 'Branding done, Trends site live, main landing + hero videos pending',
      isStartingSoon: false, confirmedStartDate: null, clientDelayDays: 0
    },
    {
      id: 'proj-3', name: 'Sarvam',
      type: 'Video Project', isRetainer: false,
      startDate: _d(-45), endDate: _d(-7), decidedEndDate: _d(-7),
      phase: 'Complete', progress: 100,
      team: { am: 'Neel', designTeam: ['Gayatri', 'Navaneeth', 'Ashwin'], devTeam: [] },
      notes: 'All 5 videos delivered and signed off. Project closed recently.',
      isStartingSoon: false, confirmedStartDate: null, clientDelayDays: 0
    },
    {
      id: 'proj-4', name: 'F-log',
      type: 'Brand Lite + Website', isRetainer: false,
      startDate: _d(-33), endDate: _d(9), decidedEndDate: _d(9),
      phase: 'Branding', progress: 25,
      team: { am: 'Hari', designTeam: ['Navaneeth', 'Urja'], devTeam: ['Sumit Yadav'] },
      notes: 'Branding in progress, website yet to start',
      isStartingSoon: false, confirmedStartDate: null, clientDelayDays: 0
    }
  ]);
  
  const [dataLoaded, setDataLoaded] = useState(false); // Track if we've loaded from DB
  
  // Historical Learning Data
  const [historicalData, setHistoricalData] = useState({
    completedProjects: [],
    taskAccuracy: {}, // taskType: { estimatedAvg, actualAvg, variancePercent }
    teamVelocity: {}, // personName: { tasksPerWeek, hoursPerWeek, accuracyRate }
    commonDelays: [], // { reason, frequency, avgDays }
    riskPatterns: [] // { pattern, occurrences, avgImpact }
  });

  const [tasks, setTasks] = useState([
    { id: 't1', projectId: 'proj-1', title: 'Logo approval from client', assignedTo: ['Achyut'], dueDate: _d(2), status: 'in-progress', priority: 'high', estimatedHours: 2, actualHours: null, clientDelayDays: 0 },
    { id: 't2', projectId: 'proj-1', title: 'Complete customer page design', assignedTo: ['Boris'], dueDate: _d(3), status: 'in-progress', priority: 'high', estimatedHours: 12, actualHours: null, clientDelayDays: 0 },
    { id: 't3', projectId: 'proj-1', title: 'Finish industry pages', assignedTo: ['Boris'], dueDate: _d(5), status: 'in-progress', priority: 'medium', estimatedHours: 16, actualHours: null, clientDelayDays: 0 },
    { id: 't4', projectId: 'proj-1', title: 'Dev - blogs page', assignedTo: ['Sumit Yadav'], dueDate: _d(4), status: 'in-progress', priority: 'medium', estimatedHours: 8, actualHours: null, clientDelayDays: 0 },
    { id: 't5', projectId: 'proj-1', title: 'QA - Cross-browser testing', assignedTo: ['Achyut'], dueDate: _d(18), status: 'backlog', priority: 'medium', estimatedHours: 4, actualHours: null, clientDelayDays: 0 },
    { id: 't6', projectId: 'proj-2', title: 'Hero video - Main landing', assignedTo: ['Navaneeth'], dueDate: _d(7), status: 'next-in-line', priority: 'high', estimatedHours: 20, actualHours: null, clientDelayDays: 0 },
    { id: 't7', projectId: 'proj-2', title: 'Hero video - Assort site', assignedTo: ['Gayatri'], dueDate: _d(7), status: 'next-in-line', priority: 'high', estimatedHours: 20, actualHours: null, clientDelayDays: 0 },
    { id: 't8', projectId: 'proj-2', title: 'Design main landing page', assignedTo: ['Boris'], dueDate: _d(6), status: 'next-in-line', priority: 'high', estimatedHours: 14, actualHours: null, clientDelayDays: 0 },
    { id: 't9', projectId: 'proj-2', title: 'Dev - Build main landing', assignedTo: ['Sumit Yadav'], dueDate: _d(14), status: 'backlog', priority: 'medium', estimatedHours: 24, actualHours: null, clientDelayDays: 0 },
    { id: 't10', projectId: 'proj-2', title: 'Finalize Assort structure', assignedTo: ['Ashwin'], dueDate: _d(5), status: 'in-progress', priority: 'medium', estimatedHours: 10, actualHours: null, clientDelayDays: 0 },
    { id: 't11', projectId: 'proj-3', title: 'Video 4 - Animation + delivery', assignedTo: ['Navaneeth'], dueDate: _d(-10), status: 'completed', priority: 'critical', manualStatus: true, estimatedHours: 24, actualHours: 26, clientDelayDays: 0 },
    { id: 't12', projectId: 'proj-3', title: 'Video 5 - Animation + delivery', assignedTo: ['Gayatri'], dueDate: _d(-10), status: 'completed', priority: 'critical', manualStatus: true, estimatedHours: 24, actualHours: 22, clientDelayDays: 0 },
    { id: 't13', projectId: 'proj-3', title: 'Client review & revisions', assignedTo: ['Neel'], dueDate: _d(-7), status: 'completed', priority: 'high', manualStatus: true, estimatedHours: 6, actualHours: 8, clientDelayDays: 0 },
    { id: 't14', projectId: 'proj-4', title: 'Branding concept presentation', assignedTo: ['Navaneeth'], dueDate: _d(1), status: 'in-progress', priority: 'high', estimatedHours: 18, actualHours: null, clientDelayDays: 0 },
    { id: 't15', projectId: 'proj-4', title: 'Custom illustration work', assignedTo: ['Urja'], dueDate: _d(4), status: 'next-in-line', priority: 'medium', estimatedHours: 12, actualHours: null, clientDelayDays: 0 },
    { id: 't16', projectId: 'proj-4', title: 'Website wireframes', assignedTo: ['Navaneeth'], dueDate: _d(9), status: 'backlog', priority: 'medium', estimatedHours: 10, actualHours: null, clientDelayDays: 0 },
    { id: 't17', projectId: 'proj-4', title: 'Website development', assignedTo: ['Sumit Yadav'], dueDate: _d(18), status: 'backlog', priority: 'low', estimatedHours: 32, actualHours: null, clientDelayDays: 0 },
  ]);

  const emptyProject = { 
    name: '', 
    type: '', 
    isRetainer: false, 
    startDate: '', 
    endDate: '', 
    decidedEndDate: '', 
    phase: 'Kickoff', 
    progress: 0, 
    team: { 
      am: '', 
      designTeam: [],  // Available design pool
      devTeam: []      // Available dev pool
    }, 
    notes: '', 
    isStartingSoon: false, 
    confirmedStartDate: null, 
    clientDelayDays: 0,
    archived: false  // For project archival
  };
  const emptyTask = { 
    projectId: '', 
    title: '', 
    assignedTo: [], 
    dueDate: '', 
    status: 'backlog', 
    priority: 'medium', 
    estimatedHours: null, 
    actualHours: null, 
    clientDelayDays: 0,
    dependsOn: [], // Array of task IDs this task depends on
    blockedBy: [], // Array of task IDs blocking this task
    riskLevel: 'none' // none, low, medium, high, critical
  };

  const [newProject, setNewProject] = useState(emptyProject);
  const [customTasks, setCustomTasks] = useState([]); // Custom tasks to add when creating project
  const [newTask, setNewTask] = useState(emptyTask);

  // ── Debounce refs for auto-saves ─────────────────────────────────────────
  const projectSaveTimer = useRef(null);
  const taskSaveTimer    = useRef(null);
  const teamSaveTimer    = useRef(null);
  const historySaveTimer = useRef(null);

  // Inject Inter font from Google Fonts
  useEffect(() => {
    if (!document.getElementById('sk-inter-font')) {
      const link = document.createElement('link');
      link.id = 'sk-inter-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Load data from Supabase on mount + restore auth session
  useEffect(() => {
    const boot = async () => {
      // 1. Restore auth session from localStorage
      const savedToken = localStorage.getItem('sk_auth_token');
      const savedEmail = localStorage.getItem('sk_auth_email');
      if (savedToken && savedEmail) {
        const user = await supabaseAuth.getUser(savedToken);
        if (user && user.email) {
          setAuthToken(savedToken);
          setAuthEmail(user.email);
          setIsLoggedIn(true);
        } else {
          // Token expired — clear it
          localStorage.removeItem('sk_auth_token');
          localStorage.removeItem('sk_auth_email');
        }
      }
      setAuthChecked(true);

      // 2. Load projects & tasks
      const { data: dbProjects } = await supabase.from('projects').select();
      const { data: dbTasks } = await supabase.from('tasks').select();

      if (!dbProjects || dbProjects.length === 0) {
        console.log('Seeding database with initial data...');
        for (const p of projects) {
          await supabase.from('projects').upsert(p).select();
        }
        for (const t of tasks) {
          await supabase.from('tasks').upsert(t).select();
        }
      } else {
        setProjects(dbProjects);
        setTasks(dbTasks);
      }

      // 3. Load team members (graceful fallback)
      try {
        const { data: dbTeam } = await supabase.from('team_members').select();
        if (dbTeam && dbTeam.length > 0) {
          setTeamMembers(dbTeam);
          console.log('✅ Team members loaded from Supabase');
        }
      } catch (_) {
        console.warn('ℹ️ team_members table not found — using local defaults');
      }

      // 4. Load historical data
      try {
        const { data: dbHistory } = await supabase.from('historical_data').select();
        if (dbHistory && dbHistory.length > 0) {
          setHistoricalData(JSON.parse(dbHistory[0].payload || '{}'));
          console.log('✅ Historical data loaded');
        }
      } catch (_) {
        console.warn('ℹ️ historical_data table not found — using defaults');
      }

      setDataLoaded(true);
    };
    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save — projects (1.5 s after last change)
  useEffect(() => {
    if (!dataLoaded || projects.length === 0) return;
    if (projectSaveTimer.current) clearTimeout(projectSaveTimer.current);
    projectSaveTimer.current = setTimeout(async () => {
      try {
        for (const p of projects) {
          await supabase.from('projects').upsert(p).select();
        }
        console.log('✅ Projects auto-saved');
      } catch (err) { console.error('❌ Project save failed:', err); }
    }, 1500);
    return () => clearTimeout(projectSaveTimer.current);
  }, [projects, dataLoaded]);

  // Debounced auto-save — tasks (1.5 s after last change)
  useEffect(() => {
    if (!dataLoaded || tasks.length === 0) return;
    if (taskSaveTimer.current) clearTimeout(taskSaveTimer.current);
    taskSaveTimer.current = setTimeout(async () => {
      try {
        for (const t of tasks) {
          await supabase.from('tasks').upsert(t).select();
        }
        console.log('✅ Tasks auto-saved');
      } catch (err) { console.error('❌ Task save failed:', err); }
    }, 1500);
    return () => clearTimeout(taskSaveTimer.current);
  }, [tasks, dataLoaded]);

  // Debounced auto-save — team members (2 s after last change)
  useEffect(() => {
    if (!dataLoaded || teamMembers.length === 0) return;
    if (teamSaveTimer.current) clearTimeout(teamSaveTimer.current);
    teamSaveTimer.current = setTimeout(async () => {
      try {
        for (const m of teamMembers) {
          await supabase.from('team_members').upsert(m).select();
        }
        console.log('✅ Team members auto-saved');
      } catch (_) { console.warn('ℹ️ team_members save skipped'); }
    }, 2000);
    return () => clearTimeout(teamSaveTimer.current);
  }, [teamMembers, dataLoaded]);

  // Debounced auto-save — historical data (3 s after last change)
  useEffect(() => {
    if (!dataLoaded) return;
    if (historySaveTimer.current) clearTimeout(historySaveTimer.current);
    historySaveTimer.current = setTimeout(async () => {
      try {
        await supabase.from('historical_data').upsert({ id: 'singleton', payload: JSON.stringify(historicalData) }).select();
        console.log('✅ Historical data auto-saved');
      } catch (_) { console.warn('ℹ️ historical_data save skipped'); }
    }, 3000);
    return () => clearTimeout(historySaveTimer.current);
  }, [historicalData, dataLoaded]);

  // --- Utilities ---
  const getDaysDelayed = (dueDate, status) => {
    if (status === 'completed') return 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(dueDate); due.setHours(0,0,0,0);
    const diff = Math.ceil((today - due) / 86400000);
    return diff > 0 ? diff : 0;
  };

  // Memoized derived task list — recomputes only when tasks array changes
  const tasksWithStatusData = useMemo(() => tasks.map(t => {
    const d = getDaysDelayed(t.dueDate, t.status);
    if (d > 0 && t.status !== 'completed' && t.status !== 'delayed' && !t.manualStatus) {
      return { ...t, status: 'delayed', daysDelayed: d };
    }
    return { ...t, daysDelayed: d };
  }), [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable callback — call sites remain unchanged
  const tasksWithStatus = useCallback(() => tasksWithStatusData, [tasksWithStatusData]);

  const filteredTasks = (projectId = null) => {
    let list = tasksWithStatus();
    if (projectId) list = list.filter(t => t.projectId === projectId);
    if (taskFilter !== 'all') list = list.filter(t => t.status === taskFilter || t.id === editingTask);
    return list;
  };

  const delayedCount = function() { return tasksWithStatus().filter(t => t.status === 'delayed').length; };

  // ─── RISK MANAGEMENT ──────────────────────────────────────────────────────
  const assessTaskRisk = function(task) {
    let riskScore = 0;
    const reasons = [];
    
    // Check if overdue
    const daysLate = getDaysDelayed(task.dueDate, task.status);
    if (daysLate > 0) {
      riskScore += Math.min(daysLate * 10, 40);
      reasons.push(`${daysLate}d overdue`);
    }
    
    // Check if blocked by dependencies
    if (task.dependsOn && task.dependsOn.length > 0) {
      const blockedBy = task.dependsOn.filter(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask && depTask.status !== 'completed';
      });
      if (blockedBy.length > 0) {
        riskScore += blockedBy.length * 15;
        reasons.push(`Blocked by ${blockedBy.length} task(s)`);
      }
    }
    
    // Check if assignee is overloaded
    if (task.assignedTo && task.assignedTo.length > 0) {
      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
      const overloadedAssignees = assignees.filter(person => {
        const workload = getWorkload().find(w => w.name === person);
        return workload && workload.activeTasks >= 8;
      });
      if (overloadedAssignees.length > 0) {
        riskScore += overloadedAssignees.length * 20;
        reasons.push(`Assignee overloaded`);
      }
    }
    
    // Check if critical priority and near deadline
    if (task.priority === 'critical') {
      const daysLeft = daysUntil(task.dueDate);
      if (daysLeft <= 2 && daysLeft >= 0) {
        riskScore += 25;
        reasons.push(`Critical task due in ${daysLeft}d`);
      }
    }
    
    // Determine risk level
    let riskLevel = 'none';
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    else if (riskScore > 0) riskLevel = 'low';
    
    return { riskLevel, riskScore, reasons };
  };
  
  // ─── DEPENDENCY MANAGEMENT ────────────────────────────────────────────────
  const canStartTask = function(task) {
    if (!task.dependsOn || task.dependsOn.length === 0) return { canStart: true, blockedBy: [] };
    
    const blockedBy = task.dependsOn
      .map(depId => tasks.find(t => t.id === depId))
      .filter(depTask => depTask && depTask.status !== 'completed');
    
    return {
      canStart: blockedBy.length === 0,
      blockedBy: blockedBy.map(t => t.title)
    };
  };
  
  const getTasksBlockedBy = function(taskId) {
    return tasks.filter(t => 
      t.dependsOn && t.dependsOn.includes(taskId)
    );
  };
  
  // ─── RESOURCE LEVELING ────────────────────────────────────────────────────
  const suggestReassignment = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    
    const workloads = getWorkload();
    const currentAssignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    
    // Determine if task needs designer or developer
    const needsDesigner = task.title.toLowerCase().includes('design') || 
                          task.title.toLowerCase().includes('wireframe') ||
                          task.title.toLowerCase().includes('visual');
    const needsDev = task.title.toLowerCase().includes('dev') || 
                     task.title.toLowerCase().includes('code') ||
                     task.title.toLowerCase().includes('implement');
    
    // Get appropriate team
    const pool = needsDesigner ? designTeam : 
                 needsDev ? devTeam : 
                 allTeamMembers;
    
    // Find available people (not overloaded, not currently assigned)
    const suggestions = workloads
      .filter(w => pool.includes(w.name))
      .filter(w => !currentAssignees.includes(w.name))
      .filter(w => w.activeTasks < 6) // Has capacity
      .sort((a, b) => a.activeTasks - b.activeTasks) // Sort by least busy
      .slice(0, 3)
      .map(w => ({
        name: w.name,
        currentTasks: w.activeTasks,
        currentHours: w.totalHours,
        capacity: Math.round((1 - w.activeTasks / 8) * 100),
        reason: w.activeTasks === 0 ? 'Available' : 
                w.activeTasks <= 2 ? 'Light load' :
                w.activeTasks <= 4 ? 'Moderate load' : 'Busy but has capacity'
      }));
    
    return {
      task,
      currentAssignees,
      suggestions,
      reason: currentAssignees.length === 0 ? 'Unassigned' : 'Overloaded assignee'
    };
  };
  
  // ─── HISTORICAL LEARNING ──────────────────────────────────────────────────
  const learnFromCompletedTask = function(task) {
    if (!task.actualHours || !task.estimatedHours) return;
    
    // Calculate accuracy
    const variance = ((task.actualHours - task.estimatedHours) / task.estimatedHours) * 100;
    
    // Update task accuracy by type
    const taskType = task.title.split(' ')[0]; // First word as type
    const current = historicalData.taskAccuracy[taskType] || { count: 0, totalVariance: 0 };
    setHistoricalData({
      ...historicalData,
      taskAccuracy: {
        ...historicalData.taskAccuracy,
        [taskType]: {
          count: current.count + 1,
          totalVariance: current.totalVariance + variance,
          avgVariance: (current.totalVariance + variance) / (current.count + 1)
        }
      }
    });
    
    // Update team velocity
    if (task.assignedTo && task.assignedTo.length > 0) {
      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
      assignees.forEach(person => {
        const current = historicalData.teamVelocity[person] || { 
          tasksCompleted: 0, 
          totalHours: 0, 
          totalVariance: 0 
        };
        setHistoricalData({
          ...historicalData,
          teamVelocity: {
            ...historicalData.teamVelocity,
            [person]: {
              tasksCompleted: current.tasksCompleted + 1,
              totalHours: current.totalHours + task.actualHours,
              totalVariance: current.totalVariance + variance,
              avgAccuracy: 100 - Math.abs((current.totalVariance + variance) / (current.tasksCompleted + 1))
            }
          }
        });
      });
    }
  };
  
  const getEstimateAdjustment = function(taskType, assignee) {
    // Get historical variance for this task type
    const taskData = historicalData.taskAccuracy[taskType];
    const personData = historicalData.teamVelocity[assignee];
    
    if (!taskData && !personData) return 1.0; // No adjustment
    
    // Average the adjustments
    const taskMultiplier = taskData ? (1 + taskData.avgVariance / 100) : 1.0;
    const personMultiplier = personData ? (1 + (100 - personData.avgAccuracy) / 100) : 1.0;
    
    return (taskMultiplier + personMultiplier) / 2;
  };

  const fmt = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const daysUntil = d => {
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(d); due.setHours(0,0,0,0);
    return Math.ceil((due - today) / 86400000);
  };

  const workingHoursUntil = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    due.setHours(17, 0, 0, 0); // End of workday
    
    if (due <= now) return 0;
    
    let workingHours = 0;
    let current = new Date(now);
    
    while (current < due) {
      const day = current.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (day !== 0 && day !== 6) {
        const remainingToday = Math.min(
          (due - current) / (1000 * 60 * 60),
          17 - current.getHours() - current.getMinutes() / 60
        );
        workingHours += Math.max(0, Math.min(8, remainingToday));
      }
      current.setDate(current.getDate() + 1);
      current.setHours(9, 0, 0, 0); // Start of next workday
    }
    
    return Math.round(workingHours * 10) / 10; // Round to 1 decimal
  };

  const getWeekRange = (weekType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (weekType === 'this-week') {
      const start = new Date(today);
      const end = new Date(today);
      end.setDate(end.getDate() + 6);
      return { start, end };
    } else { // next-week
      const start = new Date(today);
      start.setDate(start.getDate() + 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end };
    }
  };

  const isTaskInWeek = (task, weekType) => {
    const { start, end } = getWeekRange(weekType);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= start && dueDate <= end;
  };

  // --- Project CRUD ---
  // Generate tasks from project templates
  const generateTasksFromTemplate = (projectId, projectTypes) => {
    const types = projectTypes.split(' + ').map(t => t.trim());
    const newTasks = [];
    let dayOffset = 0;
    
    types.forEach(type => {
      const template = projectTemplates[type];
      if (!template) return;
      
      template.forEach(taskTemplate => {
        const daysToAdd = dayOffset + (taskTemplate.order * 3); // Space tasks 3 days apart
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysToAdd);
        
        newTasks.push({
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          projectId: projectId,
          title: taskTemplate.title,
          assignedTo: [], // Will be assigned by AM
          dueDate: dueDate.toISOString().split('T')[0],
          status: taskTemplate.order === 1 ? 'next-in-line' : 'backlog', // First task is next-in-line
          priority: taskTemplate.priority,
          estimatedHours: taskTemplate.estimatedHours,
          actualHours: null,
          clientDelayDays: 0
        });
      });
      
      // Offset next type's tasks to come after this type
      dayOffset += template.length * 3;
    });
    
    return newTasks;
  };

  const addProject = () => {
    const finalProject = { 
      ...newProject, 
      id: `proj-${Date.now()}`,
      decidedEndDate: newProject.decidedEndDate || newProject.endDate // Ensure decidedEndDate is set
    };
    
    // Generate tasks from template if project type matches
    const generatedTasks = generateTasksFromTemplate(finalProject.id, finalProject.type);
    
    // Add custom tasks with proper IDs and project reference
    const customTasksWithIds = customTasks.map(ct => ({
      ...ct,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: finalProject.id
    }));
    
    // Combine template tasks and custom tasks
    const allTasks = [...generatedTasks, ...customTasksWithIds];
    
    setProjects([...projects, finalProject]);
    if (allTasks.length > 0) {
      setTasks([...tasks, ...allTasks]);
    }
    setNewProject(emptyProject);
    setCustomTasks([]); // Clear custom tasks
    setShowAddProject(false);
  };

  const saveEditProject = () => {
    const finalProject = {
      ...editingProject,
      decidedEndDate: editingProject.decidedEndDate || editingProject.endDate
    };
    setProjects(projects.map(p => p.id === editingProject.id ? finalProject : p));
    setEditingProject(null);
  };

  const deleteProject = id => {
    if (!window.confirm('Delete project and all its tasks?')) return;
    // Delete from database
    supabase.from('projects').delete().eq('id', id);
    // Delete from state
    setProjects(projects.filter(p => p.id !== id));
    setTasks(tasks.filter(t => t.projectId !== id));
    if (selectedProject === id) setSelectedProject(null);
  };

  // --- Task CRUD ---
  const addTask = () => {
    const taskWithId = { id: `t${Date.now()}`, ...newTask };
    setTasks([...tasks, taskWithId]);

    // Slack: notify if at least one person is assigned
    const assignees = Array.isArray(taskWithId.assignedTo)
      ? taskWithId.assignedTo.filter(Boolean)
      : [taskWithId.assignedTo].filter(Boolean);
    if (assignees.length > 0) {
      const project = projects.find(p => p.id === taskWithId.projectId);
      sendSlackNotification(
        buildTaskAssignedPayload({
          task: taskWithId,
          projectName: project?.name || 'Unknown Project',
          assignees,
          assignedBy: currentUser,
          isReassign: false
        })
      ).then(status => {
        if (status === 'sent') triggerSlackToast('sent');
        else if (status === 'error') triggerSlackToast('error');
      });
    }

    setNewTask(emptyTask);
    setShowAddTask(false);
  };

  // Check if person is overloaded (2+ projects, 4+ tasks each, overlapping timelines)
  const checkWorkloadWarning = (personName) => {
    const personTasks = tasks.filter(t => {
      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      return assignees.includes(personName) && t.status !== 'completed';
    });
    
    // Group by project
    const tasksByProject = {};
    personTasks.forEach(t => {
      if (!tasksByProject[t.projectId]) tasksByProject[t.projectId] = [];
      tasksByProject[t.projectId].push(t);
    });
    
    const projectCount = Object.keys(tasksByProject).length;
    
    // Check if any project has 4+ tasks
    const overloadedProjects = Object.entries(tasksByProject).filter(([pid, tasks]) => tasks.length >= 4);
    
    // Check timeline overlap (tasks due in next 2 weeks)
    const twoWeeksOut = new Date();
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
    const upcomingTasks = personTasks.filter(t => new Date(t.dueDate) <= twoWeeksOut);
    
    if (projectCount >= 2 && overloadedProjects.length > 0 && upcomingTasks.length >= 8) {
      return {
        warning: true,
        message: `${personName} is on ${projectCount} projects with ${personTasks.length} active tasks (${upcomingTasks.length} due in next 2 weeks)`,
        tasks: personTasks.map(t => ({
          title: t.title,
          project: projects.find(p => p.id === t.projectId)?.name,
          dueDate: t.dueDate
        }))
      };
    }
    
    // Gentle nudge for moderate load
    if (personTasks.length >= 5) {
      const leastBusy = allTeamMembers
        .map(name => ({
          name,
          taskCount: tasks.filter(t => {
            const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
            return assignees.includes(name) && t.status !== 'completed';
          }).length
        }))
        .sort((a, b) => a.taskCount - b.taskCount)[0];
      
      return {
        warning: false,
        suggestion: `${personName} has ${personTasks.length} tasks. ${leastBusy.name} has ${leastBusy.taskCount} tasks and may be available.`
      };
    }
    
    return { warning: false };
  };

  const updateTask = (id, updates) => {
    const extra = updates.status !== undefined ? { manualStatus: true } : {};
    const task = tasks.find(t => t.id === id);

    // If marking as client-delay and no days logged yet, prompt for delay days
    if (updates.status === 'client-delay') {
      if (task && task.clientDelayDays === 0) {
        setClientDelayTask(id);
        setClientDelayDays('');
        return;
      }
    }

    // If marking as completed and no actual hours logged, prompt for hours
    if (updates.status === 'completed') {
      if (task && !task.actualHours) {
        setLoggingHoursTask(id);
        setLoggedHours(task.estimatedHours ? String(task.estimatedHours) : '');
        return;
      }
    }

    // Slack: notify when assignees change — only ping the *newly added* people
    if (updates.assignedTo && task) {
      const prev = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo].filter(Boolean);
      const next = Array.isArray(updates.assignedTo) ? updates.assignedTo : [updates.assignedTo].filter(Boolean);
      const newlyAdded = next.filter(a => !prev.includes(a));
      if (newlyAdded.length > 0) {
        const project = projects.find(p => p.id === task.projectId);
        sendSlackNotification(
          buildTaskAssignedPayload({
            task: { ...task, ...updates },
            projectName: project?.name || 'Unknown Project',
            assignees: newlyAdded,
            assignedBy: currentUser,
            isReassign: true
          })
        ).then(status => {
          if (status === 'sent') triggerSlackToast('sent');
          else if (status === 'error') triggerSlackToast('error');
        });
      }
    }

    // Slack: notify when status is manually flipped to delayed
    if (updates.status === 'delayed' && task) {
      const project = projects.find(p => p.id === task.projectId);
      const daysDelayed = task.daysDelayed || 1;
      sendSlackNotification(
        buildTaskDelayedPayload({
          task,
          projectName: project?.name || 'Unknown Project',
          daysDelayed
        })
      ).then(status => {
        if (status === 'sent') triggerSlackToast('sent');
        else if (status === 'error') triggerSlackToast('error');
      });
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, ...extra } : t));
  };

  const logHours = function() {
    if (!loggingHoursTask || !loggedHours) return;
    const hours = parseFloat(loggedHours);
    if (isNaN(hours) || hours <= 0) return;
    
    const task = tasks.find(t => t.id === loggingHoursTask);
    
    setTasks(prev => prev.map(t => 
      t.id === loggingHoursTask 
        ? { ...t, status: 'completed', actualHours: hours, manualStatus: true } 
        : t
    ));
    
    // Learn from this completion
    if (task) {
      learnFromCompletedTask({ ...task, actualHours: hours });
    }
    
    setLoggingHoursTask(null);
    setLoggedHours('');
  };

  const skipLoggingHours = function() {
    if (!loggingHoursTask) return;
    setTasks(prev => prev.map(t => 
      t.id === loggingHoursTask 
        ? { ...t, status: 'completed', manualStatus: true } 
        : t
    ));
    setLoggingHoursTask(null);
    setLoggedHours('');
  };

  const logClientDelay = () => {
    if (!clientDelayTask || !clientDelayDays) return;
    const days = parseInt(clientDelayDays);
    if (isNaN(days) || days <= 0) return;
    
    const task = tasks.find(t => t.id === clientDelayTask);
    if (!task) return;
    
    // Update task
    setTasks(prev => prev.map(t => 
      t.id === clientDelayTask 
        ? { ...t, status: 'client-delay', clientDelayDays: days, manualStatus: true } 
        : t
    ));
    
    // Push project deadline
    setProjects(prev => prev.map(p => {
      if (p.id !== task.projectId) return p;
      const newEndDate = new Date(p.endDate);
      newEndDate.setDate(newEndDate.getDate() + days);
      return { 
        ...p, 
        endDate: newEndDate.toISOString().split('T')[0],
        clientDelayDays: (p.clientDelayDays || 0) + days
      };
    }));
    
    setClientDelayTask(null);
    setClientDelayDays('');
  };

  // Get the raw status from state (not derived) — used for select value so it reflects saves immediately
  const getRawStatus = id => tasks.find(t => t.id === id)?.status || 'backlog';

  const deleteTask = id => { 
    if (window.confirm('Delete task?')) {
      supabase.from('tasks').delete().eq('id', id);
      setTasks(tasks.filter(t => t.id !== id)); 
    }
  };

  // --- Team workload for capacity tab (memoized) ---
  const workloadData = useMemo(() => {
    const wl = {};
    allTeamMembers.forEach(m => {
      const roleInfo = teamRoles[m] || { role: 'Unknown', type: 'design', maxProjects: 2 };
      wl[m] = {
        name: m,
        ...roleInfo,
        projects: [],
        activeTasks: 0,
        delayedTasks: 0,
        taskList: [],
        projectCount: 0,
        estimatedHours: 0,
        actualHours: 0,
        thisWeekTasks: [],
        nextWeekTasks: [],
      };
    });

    const activeProjects = projects.filter(p => p.phase !== 'Complete');

    activeProjects.forEach(p => {
      const all = [p.team.am, ...(p.team.designTeam||[]), ...(p.team.devTeam||[])].filter(Boolean);
      all.forEach(m => {
        if (wl[m] && !wl[m].projects.includes(p.name)) {
          wl[m].projects.push(p.name);
          wl[m].projectCount++;
        }
      });
    });

    const activeProjectIds = new Set(activeProjects.map(p => p.id));
    tasksWithStatusData.forEach(t => {
      if (!activeProjectIds.has(t.projectId)) return;
      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      assignees.forEach(personName => {
        if (!wl[personName]) return;
        wl[personName].taskList.push(t);
        if (t.status !== 'completed') {
          wl[personName].activeTasks++;
          if (t.estimatedHours) wl[personName].estimatedHours += t.estimatedHours;
          if (isTaskInWeek(t, 'this-week')) wl[personName].thisWeekTasks.push(t);
          if (isTaskInWeek(t, 'next-week')) wl[personName].nextWeekTasks.push(t);
        }
        if (t.status === 'completed' && t.actualHours) wl[personName].actualHours += t.actualHours;
        if (t.status === 'delayed') wl[personName].delayedTasks++;
      });
    });

    return Object.values(wl);
  }, [allTeamMembers, teamRoles, projects, tasksWithStatusData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable callback — call sites remain unchanged
  const getWorkload = useCallback(() => workloadData, [workloadData]);

  // Capacity % - Project count PRIMARY, task count SECONDARY
  const capacityPct = m => {
    // Primary signal: Project count vs max
    const projectPct = m.maxProjects > 0 ? Math.round((m.projectCount / m.maxProjects) * 100) : 0;
    
    // Secondary signal: Task load (8+ tasks = 100%)
    const taskPct = m.activeTasks === 0 ? 0 : Math.min(100, Math.round((m.activeTasks / 8) * 100));
    
    // Take the HIGHER of the two (worst case)
    return Math.max(projectPct, taskPct);
  };

  // Human-readable status label
  const capacityLabel = pct => {
    if (pct === 0)   return { label: 'Available for new work',    color: 'bg-green-100 text-green-700' };
    if (pct <= 50)   return { label: 'Has capacity', color: 'bg-indigo-100 text-indigo-700' };
    if (pct <= 75)   return { label: 'Busy',         color: 'bg-yellow-100 text-yellow-700' };
    if (pct <= 99)   return { label: 'At capacity',  color: 'bg-orange-100 text-orange-700' };
    return               { label: 'Overloaded',   color: 'bg-red-100 text-red-700' };
  };

  // --- Crisis data ---
  const crisisLib = {
    people: {
      name: 'People Crises', scenarios: [
        { id: 'p1', name: 'Key Designer Unavailable (Shubham / Navaneeth / Aditi)', severity: 'critical', playbook: ['Assess which projects are deadline-immovable', 'If Shubham out → Navaneeth takes over + loop Paul', 'If Navaneeth out → Shubham takes L2 role', 'If Aditi out → CRITICAL: Shubham + Navaneeth split work', 'Client comms within 2 hours', 'Deploy Boris or Arina if available'], commsKey: 'medical' },
        { id: 'p2', name: 'Boris Triple-Booked', severity: 'high', playbook: ['Triage: Which project is hardest deadline?', 'Activate Ashwin for 1-2 projects', 'External Webflow agency for the rest ($3-5K)', 'Stagger delivery over 3 weeks not 1'], commsKey: 'capacity' },
        { id: 'p3', name: 'Illustration Bottleneck (All 3 Booked)', severity: 'high', playbook: ['Shift illustration phase by 3-5 days if client allows', 'Deploy external illustrator with internal art direction ($500-1K)', 'Stock assets + heavy customisation as fallback'], commsKey: 'capacity' },
        { id: 'p4', name: 'AM Overload (5+ Projects)', severity: 'high', playbook: ['Triage by urgency and relationship value', 'Redistribute 1-2 projects to another AM', 'Shubham covers top-priority client comms', 'If chronic: hire within 30 days'] },
        { id: 'p5', name: 'Team Member Resignation Mid-Project', severity: 'critical', playbook: ['Document ALL work within 48 hours', 'Map projects to remaining team by skill', 'Proactive client intro to new point person', 'Knowledge transfer: 1hr session per project', 'Hire within 30-45 days'] },
      ]
    },
    project: {
      name: 'Project Execution', scenarios: [
        { id: 'pr1', name: 'Daily Scope Creep (Death by 1000 Cuts)', severity: 'critical', playbook: ['FREEZE all new requests for 48 hours', 'Calculate cumulative hours added so far', 'Present options: original scope OR +$4K +12 days', 'Implement formal change order process immediately', 'AM rule going forward: "Add to Phase 2 backlog"'], commsKey: 'scope' },
        { id: 'pr2', name: 'Multiplier Explosion (1 Page → 5 Pages)', severity: 'critical', playbook: ['Emergency stop: pause work, call client today', 'Quantify clearly: "1 page = $5K. 5 pages = $18K + 30 days"', 'Present 3 paths: Phase 2, template approach, reprice', 'Non-negotiable: cannot deliver 5 for the price of 1'], commsKey: 'scope' },
        { id: 'pr3', name: 'Midpoint Realisation: Timeline Impossible', severity: 'critical', playbook: ['Calculate gap precisely (e.g. need 80hrs, have 40hrs)', 'Option A: Extend 1 week — preferred, $0 cost', 'Option B: External resources — original date, +$3K', 'Option C: Reduce scope — agree what gets cut', 'Communicate to client TODAY — earlier = more goodwill'], commsKey: 'capacity' },
        { id: 'pr4', name: 'Client Rejects Design at Week 3 of 4', severity: 'high', playbook: ['Understand specifically what is not working', 'Check contract: how many concepts/revisions included?', 'Present 2-3 new directions (quick sketches) before executing', 'Get ALL stakeholders aligned before pivoting', 'Extend timeline 1.5 weeks minimum'] },
        { id: 'pr5', name: 'Client Content 2 Weeks Late', severity: 'high', playbook: ['Document delay with email trail', 'New deadline = original + days of delay (non-negotiable)', 'Do not compress your team timeline to absorb their delay', 'Options: accept new date OR launch with placeholders'], commsKey: 'capacity' },
      ]
    },
    resource: {
      name: 'Resource & Capacity', scenarios: [
        { id: 'r1', name: 'Vendor Ghost (External Disappears Mid-Project)', severity: 'critical', playbook: ['Assume they are gone — do not wait', 'Internal takeover or backup vendor immediately', 'Add 5-10 days to timeline', 'Transparent client communication', 'Do not pay for incomplete work'] },
        { id: 'r2', name: 'Multiple Projects Need Same Specialist Same Week', severity: 'critical', playbook: ['Triage by urgency + client relationship value', 'Time-slice: 2 days per project spread over 6 days', 'Deploy alternative team members where possible', 'Adjust timelines on least critical project', 'Proactive comms to ALL affected clients'] },
        { id: 'r3', name: 'No AM Available for New Project', severity: 'high', playbook: ['Delay start: "Kickoff in 2 weeks for proper bandwidth"', 'Temporary: Shubham manages until AM frees up', 'External PM for complex projects ($3K/month)', 'If chronic: hire AM within 30 days'] },
      ]
    },
    client: {
      name: 'Client Relations', scenarios: [
        { id: 'c1', name: 'Client CEO Changes Mid-Project', severity: 'critical', playbook: ['Immediate re-alignment meeting with new stakeholder', 'Present work-to-date with full rationale', 'Get new stakeholder buy-in (they need to own it)', 'Budget for rework — expect direction changes', 'Document all new approvals in writing'] },
        { id: 'c2', name: 'Client Threatening to Leave', severity: 'critical', playbook: ['Escalate to Paul IMMEDIATELY', 'Emergency call: Paul + Shubham + AM today', 'Listen fully — do not defend, acknowledge', 'Present specific recovery plan with dates', 'Consider: partial refund, scope add, or timeline guarantee'], commsKey: 'escalation' },
        { id: 'c3', name: 'Payment 60+ Days Overdue', severity: 'critical', playbook: ['PAUSE all work until payment is received', 'Escalate to their finance and AP team', 'Paul: founder-to-founder call', 'Offer payment plan if client is genuinely struggling', 'Legal letter if >90 days'] },
        { id: 'c4', name: 'Conflicting Feedback from Multiple Stakeholders', severity: 'high', playbook: ['Identify who has final decision-making authority', 'Require consolidated feedback: "One voice, please"', 'Surface the conflict explicitly: "A wants X, B wants Y — which?"', '"We proceed with [our recommendation] unless we hear otherwise by [date]"'] },
      ]
    },
    financial: {
      name: 'Financial', scenarios: [
        { id: 'f1', name: 'Project Over Budget (External Costs)', severity: 'high', playbook: ['STOP deploying externals without Paul approval', 'Calculate exact loss: "We are at -$3K margin"', 'Finish remaining work with internals even if slower', 'Post-mortem: underestimate, scope creep, or planning failure?', 'Next time: extend timeline vs over-deploy externals'] },
        { id: 'f2', name: 'Scope Creep Eroded All Margin', severity: 'high', playbook: ['Stop accepting free additions immediately', 'Quantify: "Original = X hours, current = 2X hours"', 'Finish core scope only — no nice-to-haves', 'Client conversation: "We have absorbed $4K of additions. Future changes require a budget increase."', 'Implement change orders going forward'] },
      ]
    },
  };

  const commsTemplates = {
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
      subject: 'Let\'s Make This Right — [Project Name]',
      professional: 'Thank you for being direct with us. We hear your concerns and take them seriously.\n\nHere is our recovery plan:\n- [Specific action 1] by [date]\n- [Specific action 2] by [date]\n- [Specific action 3] by [date]\n\n[Paul/Shubham] will personally oversee this from here. Can we schedule a call this week to align?',
    },
  };

  // --- Crisis AI recommendation ---
  const getRecommendation = () => {
    const cat = crisisLib[crisisCategory];
    const sc = cat?.scenarios.find(s => s.id === crisisScenario);
    if (!sc) return null;
    const teamWl = getWorkload();
    const overloaded = teamWl.filter(m => capacityPct(m) >= 90).map(m => m.name);
    const available = teamWl.filter(m => capacityPct(m) < 50 && m.activeTasks > 0).map(m => m.name);

    let primaryAction, tlImpact, costImpact;
    if (timelineFlex > 70) { primaryAction = 'Extend timeline to protect quality — cheapest fix'; tlImpact = '+5-10 days'; costImpact = '$0'; }
    else if (budgetFlex > 70) { primaryAction = 'Deploy external resources to hold the date'; tlImpact = '0 days'; costImpact = '+$2-5K'; }
    else { primaryAction = 'Reduce scope — agree what gets cut, hold date and budget'; tlImpact = '0 days'; costImpact = '$0'; }

    return { scenario: sc.name, primaryAction, tlImpact, costImpact, playbook: sc.playbook, commsKey: sc.commsKey, overloaded, available };
  };

  // ─── RENDER: DASHBOARD (role-aware) ───────────────────────────────────────
  const renderDashboard = function() {
    const effectiveUser = viewingAs || currentUser;
    const isManagerView = canViewAllProjects(effectiveUser);
    const today = new Date();

    // Time-aware greeting
    const hour = today.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    // Project health classifier
    const getProjectHealth = function(project) {
      const pTasks = tasksWithStatus().filter(function(t) { return t.projectId === project.id; });
      const overdueCount = pTasks.filter(function(t) { return t.status === 'delayed' && t.status !== 'completed'; }).length;
      const daysLeft = Math.ceil((new Date(project.decidedEndDate || project.endDate) - today) / 86400000);
      if (project.status === 'completed') return { label: 'Completed', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
      if (overdueCount >= 2 || daysLeft < 0) return { label: 'At Risk', color: 'bg-red-50 text-red-700', dot: 'bg-red-500' };
      if (overdueCount >= 1 || daysLeft <= 7) return { label: 'Watch', color: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500' };
      return { label: 'On Track', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' };
    };

    // Build project list scoped to viewer
    let myProjects;
    if (viewingAs || !isManagerView) {
      const myTaskProjectIds = new Set(tasks.filter(function(t) {
        const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
        return assignees.includes(effectiveUser);
      }).map(function(t) { return t.projectId; }));
      myProjects = projects.filter(function(p) { return myTaskProjectIds.has(p.id) && (showArchived || !p.archived); });
    } else {
      myProjects = projects.filter(function(p) { return showArchived || !p.archived; });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      myProjects = myProjects.filter(function(p) {
        return p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
      });
    }

    // Tasks scoped to viewer + optional person filter
    const getProjectTasks = function(projectId) {
      let pTasks = tasksWithStatus().filter(function(t) { return t.projectId === projectId && t.status !== 'completed'; });
      if (viewingAs || !isManagerView) {
        pTasks = pTasks.filter(function(t) {
          const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
          return a.includes(effectiveUser);
        });
      }
      if (filterByPerson) {
        pTasks = pTasks.filter(function(t) {
          const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
          return a.includes(filterByPerson);
        });
      }
      return pTasks.sort(function(a, b) {
        const so = { 'in-progress': 0, 'next-in-line': 1, 'backlog': 2, 'delayed': 3 };
        if (so[a.status] !== so[b.status]) return so[a.status] - so[b.status];
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    };

    // Complete task + auto-advance
    const completeTask = function(taskId, projectId) {
      updateTask(taskId, { status: 'completed' });
      const pTasks = tasksWithStatus().filter(function(t) { return t.projectId === projectId; });
      const idx = pTasks.findIndex(function(t) { return t.id === taskId; });
      for (let i = idx + 1; i < pTasks.length; i++) {
        if (pTasks[i].status !== 'completed') {
          setTimeout(function() { updateTask(pTasks[i].id, { status: 'next-in-line' }); }, 100);
          break;
        }
      }
    };

    // Shared style helpers
    const phaseColors = {
      'Kickoff': 'bg-purple-100 text-purple-700', 'Discovery': 'bg-indigo-100 text-indigo-700',
      'Strategy': 'bg-cyan-100 text-cyan-700', 'Branding': 'bg-pink-100 text-pink-700',
      'Design': 'bg-indigo-100 text-indigo-700', 'Development': 'bg-green-100 text-green-700',
      'QA': 'bg-teal-100 text-teal-700', 'Testing': 'bg-orange-100 text-orange-700',
      'Final Delivery': 'bg-emerald-100 text-emerald-700', 'Launch': 'bg-red-100 text-red-700',
      'Complete': 'bg-gray-100 text-gray-700',
    };

    // ── MANAGER / AM / LEADERSHIP VIEW ───────────────────────────
    if (isManagerView) {
      const allActiveTasks = tasksWithStatus().filter(function(t) { return t.status !== 'completed'; });
      const overdueTasks = allActiveTasks.filter(function(t) { return t.status === 'delayed'; });
      const thisWeekTasks = allActiveTasks.filter(function(t) {
        const diff = Math.ceil((new Date(t.dueDate) - today) / 86400000);
        return diff >= 0 && diff <= 7;
      });
      const teamWl = getWorkload();
      const overloadedMembers = teamWl.filter(function(m) { return capacityPct(m) >= 80; });
      const atRiskProjects = myProjects.filter(function(p) {
        const h = getProjectHealth(p);
        return h.label === 'At Risk' || h.label === 'Watch';
      });

      return (
        <div className="space-y-6">
          {/* ── Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                {greeting}, {viewingAs ? viewingAs : currentUser} 👋
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canViewAllProjects(currentUser) && !viewingAs && (
                <select
                  value={filterByPerson}
                  onChange={function(e) { setFilterByPerson(e.target.value); }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All members</option>
                  {allTeamMembers.map(function(m) { return <option key={m} value={m}>{m}</option>; })}
                </select>
              )}
              {canEditProjects(currentUser) && (
                <button
                  onClick={function() { setShowArchived(!showArchived); }}
                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${showArchived ? 'bg-gray-200 text-gray-900' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
              )}
            </div>
          </div>

          {/* ── Quick Snapshot */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Active Projects',  value: myProjects.filter(function(p) { return !p.archived; }).length, sub: atRiskProjects.length > 0 ? `${atRiskProjects.length} need attention` : 'All looking good', valueColor: 'text-gray-900', subColor: atRiskProjects.length > 0 ? 'text-orange-600' : 'text-green-600' },
              { label: 'Overdue Tasks',    value: overdueTasks.length, sub: overdueTasks.length > 0 ? 'Need immediate action' : 'All on schedule', valueColor: overdueTasks.length > 0 ? 'text-red-600' : 'text-gray-900', subColor: overdueTasks.length > 0 ? 'text-red-500' : 'text-green-600' },
              { label: 'Due This Week',    value: thisWeekTasks.length, sub: 'Upcoming deadlines', valueColor: 'text-gray-900', subColor: 'text-gray-500' },
              { label: 'Team Overloaded',  value: overloadedMembers.length, sub: overloadedMembers.length > 0 ? overloadedMembers.slice(0,2).map(function(m) { return m.name; }).join(', ') : 'Everyone in good shape', valueColor: overloadedMembers.length > 0 ? 'text-orange-600' : 'text-gray-900', subColor: overloadedMembers.length > 0 ? 'text-orange-500' : 'text-green-600' },
            ].map(function(s) {
              return (
                <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="text-xs text-gray-500 font-medium mb-1">{s.label}</div>
                  <div className={`text-3xl font-black mb-1 ${s.valueColor}`}>{s.value}</div>
                  <div className={`text-xs ${s.subColor}`}>{s.sub}</div>
                </div>
              );
            })}
          </div>

          {/* ── Needs Attention (only if issues) */}
          {(overdueTasks.length > 0 || overloadedMembers.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-900">Needs Attention</span>
              </div>
              <div className="space-y-2">
                {overdueTasks.slice(0, 3).map(function(task) {
                  const proj = projects.find(function(p) { return p.id === task.projectId; });
                  return (
                    <div key={task.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                        <span className="font-medium text-gray-900">{task.title}</span>
                        {proj && <span className="text-gray-500">— {proj.name}</span>}
                      </div>
                      <span className="text-xs text-gray-500">
                        {Array.isArray(task.assignedTo) ? task.assignedTo.join(', ') : task.assignedTo}
                      </span>
                    </div>
                  );
                })}
                {overdueTasks.length > 3 && (
                  <div className="text-xs text-amber-700 font-medium">+{overdueTasks.length - 3} more overdue</div>
                )}
                {overloadedMembers.slice(0, 2).map(function(m) {
                  return (
                    <div key={m.name} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                      <span className="font-medium text-gray-900">{m.name}</span>
                      <span className="text-gray-500">overloaded — {m.activeTasks} tasks ({capacityPct(m)}% capacity)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Portfolio Health */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">Portfolio Health</h3>
              <span className="text-xs text-gray-500">{myProjects.length} {myProjects.length === 1 ? 'project' : 'projects'}</span>
            </div>
            {myProjects.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
                <LayoutDashboard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No active projects</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myProjects.map(function(project) {
                  const activeTasks = getProjectTasks(project.id);
                  const completedCount = tasks.filter(function(t) { return t.projectId === project.id && t.status === 'completed'; }).length;
                  const totalCount = tasks.filter(function(t) { return t.projectId === project.id; }).length;
                  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                  const health = getProjectHealth(project);
                  const daysLeft = Math.ceil((new Date(project.decidedEndDate || project.endDate) - today) / 86400000);
                  const isExpanded = expandedProjects.includes(project.id);
                  const currentTask = activeTasks.find(function(t) { return t.status === 'in-progress'; }) || activeTasks.find(function(t) { return t.status === 'next-in-line'; }) || activeTasks[0];
                  const upcomingTasks = activeTasks.filter(function(t) { return t.id !== currentTask?.id; }).slice(0, 3);
                  const toggleProject = function() {
                    setExpandedProjects(isExpanded ? expandedProjects.filter(function(id) { return id !== project.id; }) : [...expandedProjects, project.id]);
                  };

                  return (
                    <div key={project.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Collapsed header */}
                      <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={toggleProject}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${health.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-gray-900 truncate">{project.name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${phaseColors[project.phase] || 'bg-gray-100 text-gray-700'}`}>{project.phase}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${health.color}`}>{health.label}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span>{project.type}</span>
                                <span>{completedCount}/{totalCount} tasks</span>
                                {project.team?.am && <span>AM: {project.team.am}</span>}
                                {daysLeft >= 0
                                  ? <span className={daysLeft <= 7 ? 'text-orange-600 font-medium' : ''}>{daysLeft}d left</span>
                                  : <span className="text-red-600 font-medium">{Math.abs(daysLeft)}d overdue</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{progressPct}%</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-gray-100">
                          {/* Action row */}
                          <div className="px-4 py-2 flex items-center gap-2 bg-gray-50 border-b border-gray-100">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{progressPct}%</span>
                            {canEditProjects(currentUser) && (
                              <>
                                <button onClick={function(e) { e.stopPropagation(); setEditingProject(project); }} className="p-1.5 hover:bg-gray-200 rounded transition-colors ml-2" title="Edit">
                                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                                <button
                                  onClick={function(e) {
                                    e.stopPropagation();
                                    if (window.confirm(`${project.archived ? 'Unarchive' : 'Archive'} this project?`)) {
                                      setProjects(projects.map(function(p) { return p.id === project.id ? { ...p, archived: !p.archived } : p; }));
                                    }
                                  }}
                                  className="p-1.5 hover:bg-gray-200 rounded transition-colors" title={project.archived ? 'Unarchive' : 'Archive'}
                                >
                                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                          {/* Current task */}
                          {currentTask && (
                            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Current Task</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={function() { completeTask(currentTask.id, project.id); }}
                                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-indigo-500 hover:bg-indigo-500 transition-all group flex items-center justify-center"
                                >
                                  <Check className="w-3 h-3 text-transparent group-hover:text-white transition-colors" />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-gray-900">{currentTask.title}</div>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                                    {currentTask.assignedTo && currentTask.assignedTo.length > 0 && (
                                      <span>{(Array.isArray(currentTask.assignedTo) ? currentTask.assignedTo : [currentTask.assignedTo]).join(', ')}</span>
                                    )}
                                    <span>Due {new Date(currentTask.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    {currentTask.estimatedHours && <span>{currentTask.estimatedHours}h</span>}
                                    <span className={`px-2 py-0.5 rounded-full font-medium ${currentTask.priority === 'critical' ? 'bg-red-100 text-red-700' : currentTask.priority === 'high' ? 'bg-orange-100 text-orange-700' : currentTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                      {currentTask.priority?.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Upcoming tasks */}
                          {upcomingTasks.length > 0 && (
                            <div className="p-4">
                              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Up Next</div>
                              <div className="space-y-1.5">
                                {upcomingTasks.map(function(task) {
                                  return (
                                    <div key={task.id} className="flex items-center gap-2 text-sm">
                                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0" />
                                      <span className="flex-1 text-gray-700 truncate">{task.title}</span>
                                      <span className="text-xs text-gray-400 flex-shrink-0">{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                  );
                                })}
                                {activeTasks.length > upcomingTasks.length + 1 && (
                                  <div className="text-xs text-gray-400">+{activeTasks.length - upcomingTasks.length - 1} more tasks</div>
                                )}
                              </div>
                            </div>
                          )}
                          {activeTasks.length === 0 && (
                            <div className="p-4 text-center text-sm text-gray-500">
                              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
                              All tasks complete!
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── TEAM MEMBER VIEW ───────────────────────────────────────────
    const myActiveTasks = tasksWithStatus().filter(function(t) {
      const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      return a.includes(effectiveUser) && t.status !== 'completed';
    }).sort(function(a, b) {
      const so = { 'in-progress': 0, 'delayed': 1, 'next-in-line': 2, 'backlog': 3 };
      return (so[a.status] ?? 4) - (so[b.status] ?? 4);
    });

    const myThisWeek = myActiveTasks.filter(function(t) {
      const diff = Math.ceil((new Date(t.dueDate) - today) / 86400000);
      return diff >= 0 && diff <= 7;
    });

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-black text-gray-900">{greeting}, {effectiveUser} 👋</h2>
          <p className="text-sm text-gray-500 mt-0.5">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* ── Active Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">Your Active Tasks</h3>
            <span className="text-xs text-gray-500">{myActiveTasks.length} tasks</span>
          </div>
          {myActiveTasks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
              <p className="text-sm font-medium text-gray-700">You're all caught up!</p>
              <p className="text-xs text-gray-400 mt-1">No active tasks right now</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myActiveTasks.map(function(task) {
                const proj = projects.find(function(p) { return p.id === task.projectId; });
                return (
                  <div key={task.id} className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow ${task.status === 'delayed' ? 'border-red-200 bg-red-50' : task.status === 'in-progress' ? 'border-indigo-200' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={function() { completeTask(task.id, task.projectId); }}
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all group flex items-center justify-center ${task.status === 'in-progress' ? 'border-indigo-500 hover:bg-indigo-500' : task.status === 'delayed' ? 'border-red-500 hover:bg-red-500' : 'border-gray-400 hover:bg-gray-400'}`}
                        title="Mark complete"
                      >
                        <Check className="w-3 h-3 text-transparent group-hover:text-white transition-colors" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">{task.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${task.status === 'in-progress' ? 'bg-indigo-100 text-indigo-700' : task.status === 'delayed' ? 'bg-red-100 text-red-700' : task.status === 'next-in-line' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                            {task.status === 'in-progress' ? 'In Progress' : task.status === 'delayed' ? 'Delayed' : task.status === 'next-in-line' ? 'Up Next' : 'Backlog'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${task.priority === 'critical' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                            {task.priority?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {proj && <span className="font-medium text-gray-700">{proj.name}</span>}
                          <span>Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          {task.estimatedHours && <span>{task.estimatedHours}h est.</span>}
                        </div>
                      </div>
                      <select
                        value={task.status}
                        onChange={function(e) { e.stopPropagation(); updateTask(task.id, { status: e.target.value }); }}
                        onClick={function(e) { e.stopPropagation(); }}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-indigo-400 flex-shrink-0"
                      >
                        <option value="backlog">Backlog</option>
                        <option value="next-in-line">Up Next</option>
                        <option value="in-progress">In Progress</option>
                        <option value="delayed">Delayed</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Due This Week */}
        {myThisWeek.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">Due This Week</h3>
              <span className="text-xs text-gray-500">{myThisWeek.length} tasks</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
              {myThisWeek.map(function(task) {
                const proj = projects.find(function(p) { return p.id === task.projectId; });
                const daysLeft = Math.ceil((new Date(task.dueDate) - today) / 86400000);
                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${daysLeft <= 2 ? 'bg-red-500' : daysLeft <= 4 ? 'bg-orange-400' : 'bg-green-400'}`} />
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{task.title}</span>
                    {proj && <span className="text-xs text-gray-400 flex-shrink-0">{proj.name}</span>}
                    <span className={`text-xs font-semibold flex-shrink-0 ${daysLeft <= 2 ? 'text-red-600' : daysLeft <= 4 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Your Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">Your Projects</h3>
            <span className="text-xs text-gray-500">{myProjects.length} projects</span>
          </div>
          {myProjects.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
              <LayoutDashboard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No projects assigned yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myProjects.map(function(project) {
                const completedCount = tasks.filter(function(t) { return t.projectId === project.id && t.status === 'completed'; }).length;
                const totalCount = tasks.filter(function(t) { return t.projectId === project.id; }).length;
                const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                const health = getProjectHealth(project);
                return (
                  <div key={project.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${health.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 truncate">{project.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${phaseColors[project.phase] || 'bg-gray-100 text-gray-700'}`}>{project.phase}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{project.type}</span>
                        <span>{completedCount}/{totalCount} done</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{progressPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProjects = function() {
    const currentProject = selectedProject ? projects.find(p => p.id === selectedProject) : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-gray-900">
              {currentProject ? currentProject.name : 'Projects'}
            </h2>
            {currentProject && (
              <button onClick={() => { setSelectedProject(null); setTaskFilter('all'); }}
                className="text-teal-600 hover:text-teal-700 font-semibold text-sm mt-1">
                ← All Projects
              </button>
            )}
          </div>
          <button onClick={() => setShowAddProject(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center transition-colors">
            <Plus className="w-4 h-4 mr-1.5" /> New Project
          </button>
        </div>

        {/* Stats - Compact */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Projects', value: projects.length, color: 'text-gray-900' },
            { label: 'Active Tasks', value: tasks.filter(t => t.status !== 'completed').length, color: 'text-gray-900' },
            { label: 'Delayed', value: delayedCount(), color: delayedCount() > 0 ? 'text-red-600' : 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg shadow-sm p-3">
              <div className="text-xs text-gray-500 font-medium mb-0.5">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Project cards - Compact & Dense */}
        <div className="space-y-2">
          {projects.map(project => {
            const pTasks = filteredTasks(project.id);
            const delayed = pTasks.filter(t => t.status === 'delayed').length;
            const completed = pTasks.filter(t => t.status === 'completed').length;
            const inProgress = pTasks.filter(t => t.status === 'in-progress').length;
            const taskCompletion = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;

            return (
              <div key={project.id} className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                delayed > 0 ? 'border-red-300 bg-red-50/20' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-6">
                  {/* Project Name & Type */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900">{project.name}</h3>
                      {project.isRetainer && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">RET</span>
                      )}
                      {delayed > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />{delayed}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{project.type}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmt(project.endDate)}
                      </span>
                      <span>AM: {project.team.am}</span>
                    </div>
                  </div>

                  {/* Phase & Progress */}
                  <div className="w-52 flex-shrink-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">{project.phase}</span>
                      <span className="font-semibold text-gray-900">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 transition-all" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="w-32 flex-shrink-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Tasks</span>
                      <span className="font-semibold text-gray-900">{completed}/{pTasks.length}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-600 transition-all" style={{ width: `${taskCompletion}%` }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                      onClick={() => { setSelectedProject(project.id); setActiveTab('tasks'); setTaskFilter('all'); }}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Tasks
                    </button>
                    <button 
                      onClick={() => setEditingProject({ ...project })}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button 
                      onClick={() => deleteProject(project.id)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Project Modal */}
        {showAddProject && (
          <ProjectModal
            title="Add New Project"
            data={newProject}
            setData={setNewProject}
            onSave={addProject}
            onCancel={() => { setShowAddProject(false); setNewProject(emptyProject); setCustomTasks([]); }}
            projectTypes={projectTypes}
            phases={phases}
            isEdit={false}
            customTasks={customTasks}
            setCustomTasks={setCustomTasks}
          />
        )}

        {/* Edit Project Modal */}
        {editingProject && (
          <ProjectModal
            title="Edit Project"
            data={editingProject}
            setData={setEditingProject}
            onSave={saveEditProject}
            onCancel={() => setEditingProject(null)}
            projectTypes={projectTypes}
            phases={phases}
            isEdit={true}
          />
        )}
      </div>
    );
  };

  // ─── RENDER: TASKS ────────────────────────────────────────────────────────
  const renderTasks = function() {
    const currentProject = selectedProject ? projects.find(p => p.id === selectedProject) : null;
    const list = filteredTasks(selectedProject);
    const delayed = list.filter(t => t.status === 'delayed');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-gray-900">
              {currentProject ? `${currentProject.name} — Tasks` : 'All Tasks'}
            </h2>
            {currentProject && (
              <button onClick={() => { setSelectedProject(null); setTaskFilter('all'); setActiveTab('projects'); }}
                className="text-teal-600 hover:text-teal-700 font-semibold text-sm mt-1">
                ← Back to Projects
              </button>
            )}
          </div>
          <button onClick={() => setShowAddTask(true)}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 flex items-center shadow-md">
            <Plus className="w-4 h-4 mr-2" /> New Task
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap gap-2">
          <button onClick={() => setTaskFilter('all')}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm ${taskFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            All ({list.length})
          </button>
          {taskStatuses.map(s => {
            const cnt = tasksWithStatus().filter(t => t.status === s.value && (!selectedProject || t.projectId === selectedProject)).length;
            return (
              <button key={s.value} onClick={() => setTaskFilter(s.value)}
                className={`px-4 py-1.5 rounded-lg font-bold text-sm border-2 ${taskFilter === s.value ? 'bg-teal-600 text-white border-teal-600' : s.color}`}>
                {s.label} ({cnt})
              </button>
            );
          })}
        </div>

        {/* Delayed alert */}
        {delayed.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <div className="font-bold text-red-900">{delayed.length} task{delayed.length > 1 ? 's' : ''} overdue — needs immediate attention</div>
              <div className="text-sm text-red-700 mt-0.5">{delayed.map(t => t.title).join(' · ')}</div>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-400">
              <List className="w-12 h-12 mx-auto mb-3" />
              <div className="font-bold">No tasks found</div>
            </div>
          ) : list.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const statusInfo = taskStatuses.find(s => s.value === task.status);
            const priorityInfo = priorities.find(p => p.value === task.priority);
            const du = daysUntil(task.dueDate);

            return (
              <div key={task.id}
                className={`bg-white rounded-xl p-4 border-2 transition-all ${task.status === 'delayed' ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-teal-300'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1 min-w-0">
                    {/* Complete toggle */}
                    <button className="mr-3 mt-0.5 flex-shrink-0"
                      onClick={() => updateTask(task.id, { status: task.status === 'completed' ? 'in-progress' : 'completed' })}>
                      {task.status === 'completed'
                        ? <CheckCircle className="w-6 h-6 text-green-600" />
                        : <Circle className="w-6 h-6 text-gray-400 hover:text-teal-600 transition-colors" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-bold text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                          {task.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityInfo?.color}`}>
                          {task.priority.toUpperCase()}
                        </span>
                        {!selectedProject && project && (
                          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{project.name}</span>
                        )}
                        {(() => {
                          const risk = assessTaskRisk(task);
                          if (risk.riskLevel !== 'none') {
                            const riskColors = {
                              'critical': 'bg-red-100 text-red-700 border-red-300',
                              'high': 'bg-orange-100 text-orange-700 border-orange-300',
                              'medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                              'low': 'bg-indigo-100 text-indigo-700 border-indigo-300'
                            };
                            return (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${riskColors[risk.riskLevel]}`} title={risk.reasons.join(', ')}>
                                ⚠️ {risk.riskLevel.toUpperCase()} RISK
                              </span>
                            );
                          }
                        })()}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                        <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" />{task.assignedTo}</span>
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1" />{fmt(task.dueDate)}
                          {du === 0 && <span className="ml-1 text-orange-600 font-bold">· Today!</span>}
                          {du === 1 && <span className="ml-1 text-orange-600 font-bold">· Tomorrow</span>}
                          {du > 1 && du <= 3 && <span className="ml-1 text-yellow-600 font-bold">· {du} days</span>}
                        </span>
                        {task.daysDelayed > 0 && (
                          <span className="flex items-center text-red-600 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />{task.daysDelayed}d overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <select
                      value={getRawStatus(task.id)}
                      onChange={e => { e.stopPropagation(); updateTask(task.id, { status: e.target.value }); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 ${taskStatuses.find(s => s.value === getRawStatus(task.id))?.color || statusInfo?.color}`}
                    >
                      {taskStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <button onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                    <button onClick={() => deleteTask(task.id)}
                      className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>

                {/* Quick edit */}
                {editingTask === task.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs font-bold text-gray-500 mb-1">Assigned To</div>
                      <select value={task.assignedTo} onChange={e => updateTask(task.id, { assignedTo: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-teal-500 focus:outline-none">
                        {allTeamMembers.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-500 mb-1">Due Date</div>
                      <input type="date" value={task.dueDate} onChange={e => updateTask(task.id, { dueDate: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-teal-500 focus:outline-none" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-500 mb-1">Priority</div>
                      <select value={task.priority} onChange={e => updateTask(task.id, { priority: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-teal-500 focus:outline-none">
                        {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl">
              <h3 className="text-2xl font-black mb-6">Add New Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Project *</label>
                  <select 
                    value={newTask.projectId || ''} 
                    onChange={e => setNewTask({ ...newTask, projectId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">Select project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Task Title *</label>
                  <input 
                    type="text" 
                    value={newTask.title || ''} 
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g., Design homepage hero section"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Assigned To *</label>
                    <select 
                      multiple
                      value={newTask.assignedTo || []} 
                      onChange={e => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setNewTask({ ...newTask, assignedTo: selected });
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                      size="5"
                    >
                      {allTeamMembers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="text-xs text-gray-500 mt-1">Hold Cmd/Ctrl to select multiple</div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Due Date *</label>
                    <input 
                      type="date" 
                      value={newTask.dueDate || ''} 
                      onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Status</label>
                    <select 
                      value={newTask.status || 'backlog'} 
                      onChange={e => setNewTask({ ...newTask, status: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    >
                      {taskStatuses.filter(s => s.value !== 'delayed').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Priority</label>
                    <select 
                      value={newTask.priority || 'medium'} 
                      onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    >
                      {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Estimated Hours</label>
                    <input
                      type="number"
                      value={newTask.estimatedHours || ''}
                      onChange={e => setNewTask({ ...newTask, estimatedHours: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="e.g., 8"
                      step="0.5"
                      min="0"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
                
                {/* Dependency Management */}
                <div>
                  <label className="block text-sm font-bold mb-1">Dependencies (blocks this task)</label>
                  <select
                    multiple
                    value={newTask.dependsOn || []}
                    onChange={function(e) {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setNewTask({ ...newTask, dependsOn: selected });
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    size="4"
                  >
                    {newTask.projectId && tasks
                      .filter(t => t.projectId === newTask.projectId && t.id !== newTask.id)
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.status})
                        </option>
                      ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    This task can't start until selected tasks are completed
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={addTask} 
                  disabled={!newTask.projectId || !newTask.title?.trim() || !newTask.assignedTo?.length || !newTask.dueDate}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add Task
                </button>
                <button 
                  onClick={() => { setShowAddTask(false); setNewTask(emptyTask); }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER: CAPACITY ─────────────────────────────────────────────────────
  const renderCapacity = function() {
    const workload = getWorkload().sort((a, b) => capacityPct(b) - capacityPct(a));
    const overloadedList  = workload.filter(m => capacityPct(m) >= 100);
    const atCapacityList  = workload.filter(m => capacityPct(m) >= 80 && capacityPct(m) < 100);
    const hasHeadroomList = workload.filter(m => capacityPct(m) > 0 && capacityPct(m) < 50);
    const availableList   = workload.filter(m => capacityPct(m) === 0);

    const filterGroups = [
      { key: 'all',        label: 'All',          count: workload.length,          color: 'text-gray-700',    active: 'bg-gray-800 text-white',    inactive: 'bg-white text-gray-700 border border-gray-300' },
      { key: 'overloaded', label: 'Overloaded',   count: overloadedList.length,    color: 'text-red-600',     active: 'bg-red-600 text-white',      inactive: 'bg-white text-red-600 border border-red-300' },
      { key: 'at-capacity',label: 'At Capacity',  count: atCapacityList.length,    color: 'text-orange-600',  active: 'bg-orange-500 text-white',   inactive: 'bg-white text-orange-600 border border-orange-300' },
      { key: 'headroom',   label: 'Has Headroom', count: hasHeadroomList.length,   color: 'text-yellow-600',  active: 'bg-yellow-500 text-white',   inactive: 'bg-white text-yellow-700 border border-yellow-300' },
      { key: 'available',  label: 'Available',    count: availableList.length,     color: 'text-green-600',   active: 'bg-green-600 text-white',    inactive: 'bg-white text-green-600 border border-green-300' },
    ];

    const visibleMembers = capacityFilter === 'all'         ? workload
      : capacityFilter === 'overloaded'  ? overloadedList
      : capacityFilter === 'at-capacity' ? atCapacityList
      : capacityFilter === 'headroom'    ? hasHeadroomList
      : availableList;

    const typeBadge = type => ({
      internal: 'bg-indigo-100 text-indigo-700',
      extended: 'bg-purple-100 text-purple-700',
      am:       'bg-teal-100 text-teal-700',
    }[type] || 'bg-gray-100 text-gray-600');

    // Members with headroom for the reassign dropdown
    const membersWithHeadroom = workload.filter(m => capacityPct(m) < 80);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Team Capacity</h2>
          <div className="flex items-center justify-between mt-1">
            <p className="text-gray-500 text-sm">
              Click a tab to filter · Click a person to see their tasks · Reassign tasks to free up bottlenecks
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setWeekView('this-week')}
                className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${weekView === 'this-week' ? 'bg-teal-600 text-white' : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-teal-400'}`}
              >
                This Week
              </button>
              <button
                onClick={() => setWeekView('next-week')}
                className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${weekView === 'next-week' ? 'bg-teal-600 text-white' : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-teal-400'}`}
              >
                Next Week
              </button>
            </div>
          </div>
        </div>

        {/* Clickable filter tabs */}
        <div className="flex flex-wrap gap-3">
          {filterGroups.map(fg => (
            <button
              key={fg.key}
              onClick={() => setCapacityFilter(fg.key)}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${capacityFilter === fg.key ? fg.active : fg.inactive}`}
            >
              <span className={`text-2xl font-black block ${capacityFilter === fg.key ? 'text-white' : fg.color}`}>
                {fg.count}
              </span>
              {fg.label}
            </button>
          ))}
        </div>

        {/* How the model works */}
        <div className="bg-gray-50 rounded-xl shadow-sm p-4 text-sm text-gray-600">
          <span className="font-bold text-gray-800">How capacity is calculated: </span>
          Higher of (projects ÷ role max) or (weighted task load ÷ role max).
          Weights: Critical = 2.0 · High = 1.5 · Medium = 1.0 · Low = 0.5.
          Internal max 2 projects · Extended max 1 · AMs max 3.
        </div>

        {/* Member cards */}
        {visibleMembers.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3" />
            <div className="font-bold">No team members in this group right now</div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMembers.map(m => {
              const pct        = capacityPct(m);
              const cl         = capacityLabel(pct);
              const barColor   = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : pct >= 50 ? 'bg-yellow-500' : pct > 0 ? 'bg-green-500' : 'bg-gray-300';
              const projectPct = m.maxProjects > 0 ? Math.round((m.projectCount / m.maxProjects) * 100) : 0;
              const taskLoadPct = m.activeTasks === 0 ? 0 : Math.min(100, Math.round((m.activeTasks / 8) * 100)); // 8+ tasks = 100%
              const activeTasks = weekView === 'this-week' 
                ? m.thisWeekTasks.filter(t => t.status !== 'completed')
                : weekView === 'next-week'
                  ? m.nextWeekTasks.filter(t => t.status !== 'completed')
                  : m.taskList.filter(t => t.status !== 'completed');
              const isExpanded  = expandedMember === m.name;

              return (
                <div key={m.name} className={`bg-white rounded-xl border-2 transition-all ${pct >= 100 ? 'border-red-300' : pct >= 80 ? 'border-orange-200' : isExpanded ? 'border-teal-400' : 'border-gray-200'}`}>

                  {/* ── Clickable header ── */}
                  <button
                    className="w-full text-left p-5"
                    onClick={() => setExpandedMember(isExpanded ? null : m.name)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold">{m.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${typeBadge(m.type)}`}>{m.role}</span>
                        {m.delayedTasks > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">
                            {m.delayedTasks} delayed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${cl.color}`}>
                          {cl.label} · {pct}%
                        </span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Main bar */}
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                      <div className={`h-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>

                    {/* Sub-bars */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                          <span>Projects</span>
                          <span className={projectPct >= 100 ? 'text-red-600' : ''}>{m.projectCount} / {m.maxProjects}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${projectPct >= 100 ? 'bg-red-500' : projectPct >= 80 ? 'bg-orange-500' : 'bg-indigo-400'}`}
                            style={{ width: `${Math.min(projectPct, 100)}%` }} />
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                          <span>Task load</span>
                          <span className={taskLoadPct >= 100 ? 'text-red-600' : ''}>{m.activeTasks} active</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${taskLoadPct >= 100 ? 'bg-red-500' : taskLoadPct >= 80 ? 'bg-orange-500' : 'bg-purple-400'}`}
                            style={{ width: `${Math.min(taskLoadPct, 100)}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Projects chips */}
                    {m.projects.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {m.projects.map(p => (
                          <span key={p} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">{p}</span>
                        ))}
                      </div>
                    )}

                    {m.projectCount === 0 && m.activeTasks === 0 && (
                      <div className="mt-3 text-sm text-green-600 font-semibold flex items-center gap-1">
                        <Check className="w-4 h-4" /> Available for new work
                      </div>
                    )}

                    {!isExpanded && activeTasks.length > 0 && (
                      <div className="mt-3 text-xs text-teal-600 font-semibold">
                        {activeTasks.length} active task{activeTasks.length > 1 ? 's' : ''} — click to manage
                      </div>
                    )}
                  </button>

                  {/* ── Expanded task list ── */}
                  {isExpanded && (
                    <div className="border-t-2 border-gray-100 px-5 pb-5">
                      {/* Next deadline countdown */}
                      {activeTasks.length > 0 && (() => {
                        const sorted = [...activeTasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                        const nextTask = sorted[0];
                        const workHours = workingHoursUntil(nextTask.dueDate);
                        const workDays = Math.floor(workHours / 8);
                        const remainingWorkHours = Math.round((workHours % 8) * 10) / 10;
                        
                        const urgencyColor = workHours < 8 ? 'bg-red-50 border-red-300 text-red-800'
                          : workHours <= 24 ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                          : 'bg-green-50 border-green-300 text-green-800';
                        
                        const urgencyIcon = workHours < 8 ? '🚨' : workHours <= 24 ? '⚡' : '✓';

                        return (
                          <div className={`border-2 rounded-xl p-4 mb-4 mt-4 ${urgencyColor}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{urgencyIcon}</span>
                                <span className="font-bold text-sm uppercase tracking-wider">Next Deadline</span>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black">
                                  {workHours}h
                                </div>
                                <div className="text-xs font-semibold opacity-75">
                                  {workDays > 0 && `(~${workDays} work day${workDays > 1 ? 's' : ''})`}
                                  {workDays === 0 && workHours > 0 && `(today)`}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-semibold truncate">
                              {nextTask.title}
                            </div>
                            <div className="text-xs font-semibold opacity-75 mt-1">
                              {projects.find(p => p.id === nextTask.projectId)?.name} · Due {fmt(nextTask.dueDate)}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between py-4">
                        <h4 className="font-bold text-gray-800">
                          {activeTasks.length > 0 ? (
                            <span>
                              {activeTasks.length} Active Task{activeTasks.length > 1 ? 's' : ''}
                              {activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) > 0 && (
                                <span className="ml-2 text-sm font-semibold text-teal-600">
                                  ({activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)}h estimated)
                                </span>
                              )}
                            </span>
                          ) : 'No active tasks'}
                        </h4>
                        {membersWithHeadroom.filter(x => x.name !== m.name).length > 0 && activeTasks.length > 0 && (
                          <div className="text-xs text-gray-500 font-semibold">
                            Reassign to: {membersWithHeadroom.filter(x => x.name !== m.name).map(x => x.name).join(', ')}
                          </div>
                        )}
                      </div>

                      {activeTasks.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <Check className="w-8 h-8 mx-auto mb-2" />
                          <div className="font-semibold">All tasks completed</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeTasks.map(t => {
                            const proj = projects.find(p => p.id === t.projectId);
                            const si   = taskStatuses.find(s => s.value === getRawStatus(t.id));
                            const pi   = priorities.find(p => p.value === t.priority);
                            const du   = daysUntil(t.dueDate);
                            const isReassigning = reassigningTask === t.id;

                            return (
                              <div key={t.id} className={`rounded-xl border-2 transition-all ${t.status === 'delayed' ? 'border-red-200 bg-red-50' : isReassigning ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-start p-3 gap-3">
                                  {/* Complete toggle */}
                                  <button
                                    onClick={() => updateTask(t.id, { status: 'completed' })}
                                    className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                                    title="Mark complete"
                                  >
                                    <Circle className="w-5 h-5 text-gray-400 hover:text-green-600 transition-colors" />
                                  </button>

                                  {/* Task info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-gray-900 text-sm">{t.title}</span>
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${pi?.color}`}>{t.priority.toUpperCase()}</span>
                                    </div>
                                    
                                    {/* Assignees on separate line */}
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <Users className="w-3 h-3 text-gray-400" />
                                      <div className="flex items-center gap-1.5">
                                        {(Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]).map((person, idx) => (
                                          <span key={person}>
                                            <span className="text-xs text-gray-600 font-medium">{person}</span>
                                            {idx < (Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]).length - 1 && (
                                              <span className="text-gray-400 mx-1">•</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                      <span className="font-semibold text-teal-700">{proj?.name}</span>
                                      <span>Due {fmt(t.dueDate)}</span>
                                      {du === 0 && <span className="text-orange-600 font-bold">Today!</span>}
                                      {du > 0 && du <= 3 && <span className="text-yellow-600 font-bold">in {du}d</span>}
                                      {t.daysDelayed > 0 && <span className="text-red-600 font-bold">{t.daysDelayed}d overdue</span>}
                                      <span className={`px-2 py-0.5 rounded font-bold ${si?.color}`}>{si?.label}</span>
                                    </div>
                                  </div>

                                  {/* Reassign button */}
                                  <button
                                    onClick={() => setReassigningTask(isReassigning ? null : t.id)}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isReassigning ? 'bg-teal-600 text-white' : 'bg-white border-2 border-teal-400 text-teal-700 hover:bg-teal-50'}`}
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                    Reassign
                                  </button>
                                </div>

                                {/* Reassign picker */}
                                {isReassigning && (
                                  <div className="px-3 pb-3">
                                    <div className="text-xs font-bold text-gray-600 mb-2">Pick someone with headroom:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {membersWithHeadroom
                                        .filter(x => x.name !== m.name && x.name !== 'Freelancer')
                                        .map(x => {
                                          const xPct = capacityPct(x);
                                          const xCl  = capacityLabel(xPct);
                                          return (
                                            <button
                                              key={x.name}
                                              onClick={() => {
                                                // Check workload before assigning
                                                const warning = checkWorkloadWarning(x.name);
                                                if (warning.warning || warning.suggestion) {
                                                  setWorkloadWarning({
                                                    taskId: t.id,
                                                    personName: x.name,
                                                    warningData: warning
                                                  });
                                                } else {
                                                  updateTask(t.id, { assignedTo: [x.name] });
                                                  setReassigningTask(null);
                                                }
                                              }}
                                              className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-teal-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all"
                                            >
                                              <div>
                                                <div className="text-sm font-bold text-gray-800">{x.name}</div>
                                                <div className={`text-xs font-semibold ${xCl.color.split(' ')[1]}`}>{xCl.label} · {xPct}%</div>
                                              </div>
                                            </button>
                                          );
                                        })}
                                    </div>
                                    {membersWithHeadroom.filter(x => x.name !== m.name && x.name !== 'Freelancer').length === 0 && (
                                      <div className="text-sm text-gray-500 italic">Everyone else is also at capacity.</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };


  // ─── RENDER: TEAM MANAGEMENT ──────────────────────────────────────────────
  const renderTeam = function() {
    if (!canEditProjects(currentUser)) {
      return (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Team management is available to admins and account managers.</p>
        </div>
      );
    }

    const teamWl = getWorkload();
    const getWorkloadForMember = function(name) {
      return teamWl.find(function(m) { return m.name === name; });
    };

    const groups = [
      { label: 'Design Team', type: 'design', color: 'bg-indigo-50 border-indigo-200', badgeColor: 'bg-indigo-100 text-indigo-700' },
      { label: 'Dev Team',    type: 'dev',    color: 'bg-green-50 border-green-200',   badgeColor: 'bg-green-100 text-green-700' },
      { label: 'Account Managers', type: 'am', color: 'bg-teal-50 border-teal-200',   badgeColor: 'bg-teal-100 text-teal-700' },
    ];

    const sysRoleOptions = [
      { value: 'team_member', label: 'Team Member' },
      { value: 'am',          label: 'Account Manager' },
      { value: 'admin',       label: 'Admin' },
    ];

    const saveMember = function() {
      if (!newMember.name.trim() || !newMember.role.trim()) return;
      if (editingMember) {
        setTeamMembers(teamMembers.map(function(m) {
          return m.id === editingMember.id ? { ...m, ...newMember } : m;
        }));
        setEditingMember(null);
      } else {
        const id = 'tm-' + Date.now();
        setTeamMembers([...teamMembers, { ...newMember, id, active: true }]);
        setShowAddMember(false);
      }
      setNewMember({ name: '', role: '', type: 'design', maxProjects: 2, sysRole: 'team_member' });
    };

    const openEdit = function(member) {
      setEditingMember(member);
      setNewMember({ name: member.name, role: member.role, type: member.type, maxProjects: member.maxProjects, sysRole: member.sysRole });
    };

    const toggleActive = function(member) {
      const action = member.active ? 'deactivate' : 'reactivate';
      if (window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${member.name}?`)) {
        setTeamMembers(teamMembers.map(function(m) { return m.id === member.id ? { ...m, active: !m.active } : m; }));
      }
    };

    // Modal for add/edit
    const renderMemberModal = function() {
      const isEdit = !!editingMember;
      const close = function() {
        setShowAddMember(false);
        setEditingMember(null);
        setNewMember({ name: '', role: '', type: 'design', maxProjects: 2, sysRole: 'team_member' });
      };
      return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900">{isEdit ? `Edit ${editingMember.name}` : 'Add Team Member'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text" placeholder="e.g. Priya Sharma"
                  value={newMember.name}
                  onChange={function(e) { setNewMember({ ...newMember, name: e.target.value }); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Role / Title *</label>
                <input
                  type="text" placeholder="e.g. Brand Designer"
                  value={newMember.role}
                  onChange={function(e) { setNewMember({ ...newMember, role: e.target.value }); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Team</label>
                  <select
                    value={newMember.type}
                    onChange={function(e) { setNewMember({ ...newMember, type: e.target.value }); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="design">Design</option>
                    <option value="dev">Dev</option>
                    <option value="am">Account Management</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Max Projects</label>
                  <input
                    type="number" min="1" max="5"
                    value={newMember.maxProjects}
                    onChange={function(e) { setNewMember({ ...newMember, maxProjects: parseInt(e.target.value) || 2 }); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">System Role</label>
                <select
                  value={newMember.sysRole}
                  onChange={function(e) { setNewMember({ ...newMember, sysRole: e.target.value }); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {sysRoleOptions.map(function(o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
                </select>
                <p className="text-xs text-gray-500 mt-1">Admins & AMs can edit projects and see all dashboards.</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={close} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={saveMember}
                disabled={!newMember.name.trim() || !newMember.role.trim()}
                className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isEdit ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Team</h2>
            <p className="text-sm text-gray-500 mt-0.5">{activeMembers.length} active · {teamMembers.filter(function(m) { return !m.active; }).length} inactive</p>
          </div>
          <button
            onClick={function() { setShowAddMember(true); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>

        {/* Team Groups */}
        {groups.map(function(group) {
          const groupMembers = teamMembers.filter(function(m) { return m.type === group.type; });
          if (groupMembers.length === 0) return null;
          return (
            <div key={group.type}>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">{group.label}</h3>
              <div className="grid grid-cols-1 gap-2">
                {groupMembers.map(function(member) {
                  const wl = getWorkloadForMember(member.name);
                  const pct = wl ? capacityPct(wl) : 0;
                  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-green-500';
                  return (
                    <div key={member.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${!member.active ? 'opacity-50' : ''}`}>
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${group.badgeColor}`}>
                        {member.name.charAt(0)}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm ${member.active ? 'text-gray-900' : 'text-gray-400'}`}>{member.name}</span>
                          {!member.active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">Inactive</span>}
                          <span className="text-xs text-gray-500">{member.role}</span>
                          {member.sysRole !== 'team_member' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold capitalize">{member.sysRole}</span>
                          )}
                        </div>
                        {/* Capacity bar */}
                        {member.active && wl && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-16 flex-shrink-0">{wl.activeTasks} tasks · {pct}%</span>
                          </div>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={function() { openEdit(member); }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit member"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button
                          onClick={function() { toggleActive(member); }}
                          className={`p-1.5 rounded-lg transition-colors text-xs font-semibold px-2 py-1 ${member.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={member.active ? 'Deactivate' : 'Reactivate'}
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

        {/* Add/Edit modal */}
        {(showAddMember || editingMember) && renderMemberModal()}
      </div>
    );
  };

  // ─── RENDER: TIMELINE / GANTT VIEW ───────────────────────────────────────
  const renderTimeline = function() {
    const today = new Date();
    const activeProjects = projects.filter(p => p.phase !== 'Complete' && !p.archived);
    
    // Calculate timeline boundaries
    const allDates = activeProjects.flatMap(p => [
      new Date(p.startDate),
      new Date(p.endDate || p.decidedEndDate)
    ]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    // Function to get position percentage
    const getPosition = function(date) {
      const d = new Date(date);
      const daysSinceStart = Math.ceil((d - minDate) / (1000 * 60 * 60 * 24));
      return (daysSinceStart / totalDays) * 100;
    };
    
    const getWidth = function(startDate, endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return (duration / totalDays) * 100;
    };
    
    const todayPosition = getPosition(today);
    
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Project Timeline</h2>
          <p className="text-gray-500 mt-1">Gantt view of all active projects</p>
        </div>
        
        {/* Timeline header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm font-semibold text-gray-700 mb-4">
            {minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ({totalDays} days)
          </div>
          
          {/* Timeline grid */}
          <div className="relative" style={{ minHeight: `${activeProjects.length * 60 + 100}px` }}>
            {/* Today indicator */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${todayPosition}%` }}
            >
              <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                TODAY
              </div>
            </div>
            
            {/* Month markers */}
            <div className="absolute top-0 left-0 right-0 h-8 border-b border-gray-200 flex">
              {Array.from({ length: Math.ceil(totalDays / 30) }).map((_, idx) => {
                const monthDate = new Date(minDate);
                monthDate.setDate(monthDate.getDate() + (idx * 30));
                return (
                  <div 
                    key={idx}
                    className="text-xs text-gray-500 font-semibold"
                    style={{ 
                      position: 'absolute',
                      left: `${(idx * 30 / totalDays) * 100}%`,
                      top: 0
                    }}
                  >
                    {monthDate.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                );
              })}
            </div>
            
            {/* Project bars */}
            <div className="pt-12 space-y-2">
              {activeProjects.map((project, idx) => {
                const startPos = getPosition(project.startDate);
                const barWidth = getWidth(project.startDate, project.endDate || project.decidedEndDate);
                const daysLeft = Math.ceil((new Date(project.endDate || project.decidedEndDate) - today) / (1000 * 60 * 60 * 24));
                const isLate = daysLeft < 0;
                const isUrgent = daysLeft <= 7 && daysLeft >= 0;
                
                const phaseColors = {
                  'Kickoff': 'bg-purple-500',
                  'Discovery': 'bg-indigo-500',
                  'Strategy': 'bg-cyan-500',
                  'Branding': 'bg-pink-500',
                  'Design': 'bg-indigo-500',
                  'Development': 'bg-green-500',
                  'QA': 'bg-orange-500',
                  'Final Delivery': 'bg-red-500'
                };
                
                return (
                  <div key={project.id} className="relative h-12 flex items-center">
                    {/* Project name */}
                    <div className="absolute left-0 w-48 text-sm font-semibold text-gray-900 truncate pr-2">
                      {project.name}
                    </div>
                    
                    {/* Timeline bar */}
                    <div 
                      className={`absolute h-8 rounded shadow-md ${phaseColors[project.phase] || 'bg-gray-500'} ${isLate ? 'opacity-60' : ''}`}
                      style={{
                        left: `calc(12rem + ${startPos}%)`,
                        width: `${barWidth}%`
                      }}
                      title={`${project.name}: ${project.startDate} → ${project.endDate || project.decidedEndDate}`}
                    >
                      <div className="px-2 py-1 text-white text-xs font-semibold truncate">
                        {project.phase}
                      </div>
                      {isLate && (
                        <div className="absolute -top-6 left-0 bg-red-600 text-white text-xs px-2 py-0.5 rounded">
                          {Math.abs(daysLeft)}d late
                        </div>
                      )}
                      {isUrgent && (
                        <div className="absolute -top-6 right-0 bg-orange-600 text-white text-xs px-2 py-0.5 rounded">
                          {daysLeft}d left
                        </div>
                      )}
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
                  <div className="text-sm font-bold text-gray-900 mb-2">
                    Week {weekIdx + 1}
                  </div>
                  <div className="text-xs text-gray-600 mb-3">
                    {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="space-y-1">
                    {allTeamMembers.slice(0, 8).map(member => {
                      const memberTasks = tasks.filter(t => {
                        const dueDate = new Date(t.dueDate);
                        const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
                        return assignees.includes(member) && 
                               t.status !== 'completed' &&
                               dueDate >= weekStart && 
                               dueDate <= weekEnd;
                      });
                      
                      const load = memberTasks.length;
                      const loadColor = load === 0 ? 'bg-gray-100' :
                                       load <= 2 ? 'bg-green-200' :
                                       load <= 4 ? 'bg-yellow-200' :
                                       load <= 6 ? 'bg-orange-200' : 'bg-red-200';
                      
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
  };

  // ─── RENDER: RISK & RESOURCES ─────────────────────────────────────────────
  const renderRiskAndResources = function() {
    // Assess all active tasks for risk
    const activeTasks = tasksWithStatus().filter(t => t.status !== 'completed');
    const tasksWithRisk = activeTasks.map(task => ({
      ...task,
      risk: assessTaskRisk(task),
      dependency: canStartTask(task),
      reassignment: task.assignedTo && task.assignedTo.length > 0 ? suggestReassignment(task.id) : null
    }));
    
    // Sort by risk level
    const riskOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
    const highRiskTasks = tasksWithRisk
      .filter(t => t.risk.riskLevel !== 'none')
      .sort((a, b) => riskOrder[a.risk.riskLevel] - riskOrder[b.risk.riskLevel]);
    
    // Find overloaded people
    const overloadedPeople = getWorkload().filter(w => w.activeTasks >= 6);
    
    // Find blocked tasks
    const blockedTasks = tasksWithRisk.filter(t => !t.dependency.canStart);
    
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Risk & Resource Management</h2>
          <p className="text-gray-500 mt-1">Predictive insights, dependency tracking, and resource optimization</p>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="text-red-600 text-2xl font-black">{highRiskTasks.filter(t => t.risk.riskLevel === 'critical' || t.risk.riskLevel === 'high').length}</div>
            <div className="text-red-900 font-semibold text-sm">High Risk Tasks</div>
          </div>
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <div className="text-orange-600 text-2xl font-black">{blockedTasks.length}</div>
            <div className="text-orange-900 font-semibold text-sm">Blocked by Dependencies</div>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="text-yellow-600 text-2xl font-black">{overloadedPeople.length}</div>
            <div className="text-yellow-900 font-semibold text-sm">Overloaded Team Members</div>
          </div>
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
            <div className="text-indigo-600 text-2xl font-black">{Object.keys(historicalData.teamVelocity).length}</div>
            <div className="text-indigo-900 font-semibold text-sm">Team Members Tracked</div>
          </div>
        </div>
        
        {/* High Risk Tasks */}
        {highRiskTasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              At-Risk Tasks
            </h3>
            <div className="space-y-3">
              {highRiskTasks.slice(0, 10).map(task => {
                const project = projects.find(p => p.id === task.projectId);
                const riskColors = {
                  'critical': 'bg-red-100 text-red-700 border-red-300',
                  'high': 'bg-orange-100 text-orange-700 border-orange-300',
                  'medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                  'low': 'bg-indigo-100 text-indigo-700 border-indigo-300'
                };
                
                return (
                  <div key={task.id} className="rounded-lg shadow-sm p-4 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${riskColors[task.risk.riskLevel]}`}>
                            {task.risk.riskLevel.toUpperCase()} RISK
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{task.title}</span>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          {project?.name} • Due {fmt(task.dueDate)}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {task.risk.reasons.map((reason, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                        
                        {/* Reassignment Suggestions */}
                        {task.reassignment && task.reassignment.suggestions.length > 0 && (
                          <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                            <div className="text-xs font-bold text-green-900 mb-2">💡 Reassignment Suggestions:</div>
                            <div className="flex gap-2">
                              {task.reassignment.suggestions.slice(0, 3).map((sug, idx) => (
                                <button
                                  key={idx}
                                  onClick={function() {
                                    if (window.confirm(`Reassign to ${sug.name}?`)) {
                                      updateTask(task.id, { assignedTo: [sug.name] });
                                    }
                                  }}
                                  className="text-xs bg-white border border-green-300 px-3 py-1.5 rounded hover:bg-green-100 transition-colors"
                                >
                                  <div className="font-semibold text-green-900">{sug.name}</div>
                                  <div className="text-green-700">{sug.currentTasks} tasks • {sug.capacity}% capacity</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Dependency Map */}
        {blockedTasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🔗 Blocked Tasks (Dependency Issues)</h3>
            <div className="space-y-3">
              {blockedTasks.slice(0, 10).map(task => (
                <div key={task.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <div className="font-semibold text-gray-900 mb-1">{task.title}</div>
                  <div className="text-sm text-orange-700">
                    ⚠️ Blocked by: {task.dependency.blockedBy.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Historical Learning Insights */}
        {Object.keys(historicalData.teamVelocity).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Team Performance Insights</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(historicalData.teamVelocity).slice(0, 9).map(([name, data]) => (
                <div key={name} className="rounded-lg p-3 bg-gray-50">
                  <div className="font-semibold text-gray-900">{name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {data.tasksCompleted} tasks completed
                  </div>
                  <div className="text-sm text-gray-600">
                    {Math.round(data.avgAccuracy)}% estimate accuracy
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER: CRISIS NAVIGATOR ─────────────────────────────────────────────
  const renderCrisis = function() {
    const reco = showReco ? getRecommendation() : null;
    const cat = crisisLib[crisisCategory];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Crisis Navigator</h2>
          <p className="text-gray-500 mt-1">Select a scenario — recommendations auto-load your live team data</p>
        </div>

        {/* Live context banner */}
        <div className="bg-teal-50 border-2 border-teal-300 rounded-xl p-4 flex items-start">
          <TrendingUp className="w-5 h-5 text-teal-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold text-teal-800">Live context loaded: </span>
            <span className="text-teal-700">
              {projects.length} active projects · {delayedCount()} delayed tasks ·{' '}
              {getWorkload().filter(m => capacityPct(m) >= 90).map(m => m.name).join(', ') || 'no one'} at capacity
            </span>
          </div>
        </div>

        {/* Scenario picker */}
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2">Crisis Category</label>
            <select value={crisisCategory} onChange={e => { setCrisisCategory(e.target.value); setCrisisScenario(''); setShowReco(false); }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none">
              <option value="">Select category...</option>
              {Object.entries(crisisLib).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>

          {crisisCategory && (
            <div>
              <label className="block text-sm font-bold mb-2">Specific Scenario</label>
              <div className="space-y-2">
                {cat.scenarios.map(s => (
                  <button key={s.id} onClick={() => { setCrisisScenario(s.id); setShowReco(false); }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${crisisScenario === s.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">{s.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
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
            <button onClick={() => setShowReco(true)}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors">
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
              {/* Primary action */}
              <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4">
                <div className="text-xs font-bold text-teal-600 mb-1">RECOMMENDED ACTION</div>
                <div className="text-lg font-bold text-gray-900">{reco.primaryAction}</div>
              </div>

              {/* Impact */}
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
                  <div className="text-sm font-bold">{reco.overloaded.length > 0 ? `${reco.overloaded.join(', ')} at limit` : 'Team has capacity'}</div>
                </div>
              </div>

              {/* Live team insight */}
              {reco.overloaded.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <span className="font-bold text-red-700">⚠ Team conflict: </span>
                  <span className="text-red-600">{reco.overloaded.join(', ')} are already at capacity. Do not assign more work without rebalancing.</span>
                </div>
              )}
              {reco.available.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <span className="font-bold text-green-700">✓ Available capacity: </span>
                  <span className="text-green-600">{reco.available.join(', ')} have headroom and could absorb work.</span>
                </div>
              )}

              {/* Playbook */}
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

              {/* Comms link */}
              {reco.commsKey && commsTemplates[reco.commsKey] && (
                <button onClick={() => setCopiedTemplate(reco.commsKey)}
                  className="w-full border-2 border-teal-500 text-teal-700 py-3 rounded-lg font-bold hover:bg-teal-50 flex items-center justify-center transition-colors">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Use "{commsTemplates[reco.commsKey].name}" Template
                </button>
              )}
            </div>
          </div>
        )}

        {/* Inline template viewer if triggered from crisis */}
        {copiedTemplate && commsTemplates[copiedTemplate] && (
          <TemplateCard template={commsTemplates[copiedTemplate]} onClose={() => setCopiedTemplate(null)} />
        )}
      </div>
    );
  };

  // ─── SUB-COMPONENTS ───────────────────────────────────────────────────────

  const ProjectModal = ({ title, data, setData, onSave, onCancel, projectTypes, phases, isEdit = false, customTasks = [], setCustomTasks = null }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="space-y-2.5">
          {/* Row 1: Name */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Project Name *</label>
            <input 
              type="text" 
              value={data.name || ''} 
              onChange={e => setData({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" 
            />
          </div>
          
          {/* Row 2: Type (multi-select) + AM */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Project Type(s) *</label>
              
              {/* Selected types */}
              {(data.type || '').split(' + ').filter(Boolean).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(data.type || '').split(' + ').filter(Boolean).map(type => (
                    <span 
                      key={type} 
                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded"
                    >
                      {type}
                      <button
                        onClick={() => {
                          const types = (data.type || '').split(' + ').filter(t => t !== type);
                          setData({ ...data, type: types.join(' + ') });
                        }}
                        className="hover:text-purple-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Available types */}
              <div className="border border-gray-300 rounded-lg p-1.5 max-h-24 overflow-y-auto">
                {['Brand Lite', 'Full Rebrand', 'Landing Page', 'Full Website', 'Video Project', 'Pitch Deck', 'Product Design', 'Other'].map(type => {
                  const isSelected = (data.type || '').includes(type);
                  if (isSelected) return null;
                  
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        const currentTypes = (data.type || '').split(' + ').filter(Boolean);
                        const newTypes = [...currentTypes, type];
                        setData({ ...data, type: newTypes.join(' + ') });
                      }}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-purple-50 transition-colors"
                    >
                      <span className="font-medium">{type}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 mt-1">Click to add multiple types</div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Account Manager *</label>
              <select 
                value={data.team?.am || ''} 
                onChange={e => setData({ ...data, team: { ...data.team, am: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select AM...</option>
                {['Achyut', 'Hari', 'Neel'].map(am => <option key={am} value={am}>{am}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Team Selection - Smart Tag Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Design Team</label>
              
              {/* Selected designers */}
              {(data.team?.designTeam || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(data.team?.designTeam || []).map(person => (
                    <span 
                      key={person} 
                      className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded"
                    >
                      {person}
                      <button
                        onClick={() => {
                          const updated = (data.team?.designTeam || []).filter(p => p !== person);
                          setData({ ...data, team: { ...data.team, designTeam: updated } });
                        }}
                        className="hover:text-indigo-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Available designers with capacity indicators */}
              <div className="border border-gray-300 rounded-lg p-1.5 max-h-28 overflow-y-auto">
                {designTeam
                  .filter(d => !(data.team?.designTeam || []).includes(d))
                  .map(designer => {
                    const memberWorkload = getWorkload().find(w => w.name === designer);
                    const pct = memberWorkload ? capacityPct(memberWorkload) : 0;
                    const cl = capacityLabel(pct);
                    const hasIssues = memberWorkload && (memberWorkload.delayedTasks > 0 || pct >= 100);
                    
                    return (
                      <button
                        key={designer}
                        onClick={() => {
                          const updated = [...(data.team?.designTeam || []), designer];
                          setData({ ...data, team: { ...data.team, designTeam: updated } });
                        }}
                        className={`w-full text-left px-1.5 py-1 text-xs rounded hover:bg-indigo-50 transition-colors mb-0.5 ${
                          hasIssues ? 'bg-orange-50 border border-orange-200' : 'border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-gray-900 text-xs">{designer}</span>
                          <span className={`text-xs px-1 py-0.5 rounded font-semibold ${cl.color}`}>
                            {pct}%
                          </span>
                        </div>
                        {memberWorkload && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span>{memberWorkload.projectCount}/{memberWorkload.maxProjects} proj</span>
                            <span>•</span>
                            <span>{memberWorkload.activeTasks} tasks</span>
                            {memberWorkload.estimatedHours > 0 && (
                              <>
                                <span>•</span>
                                <span>{memberWorkload.estimatedHours}h</span>
                              </>
                            )}
                            {memberWorkload.delayedTasks > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-red-600 font-semibold">{memberWorkload.delayedTasks} delayed ⚠</span>
                              </>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Dev Team</label>
              
              {/* Selected devs */}
              {(data.team?.devTeam || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(data.team?.devTeam || []).map(person => (
                    <span 
                      key={person} 
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded"
                    >
                      {person}
                      <button
                        onClick={() => {
                          const updated = (data.team?.devTeam || []).filter(p => p !== person);
                          setData({ ...data, team: { ...data.team, devTeam: updated } });
                        }}
                        className="hover:text-green-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Available devs with capacity indicators */}
              <div className="border border-gray-300 rounded-lg p-1.5 max-h-28 overflow-y-auto">
                {devTeam
                  .filter(d => !(data.team?.devTeam || []).includes(d))
                  .map(dev => {
                    const memberWorkload = getWorkload().find(w => w.name === dev);
                    const pct = memberWorkload ? capacityPct(memberWorkload) : 0;
                    const cl = capacityLabel(pct);
                    const hasIssues = memberWorkload && (memberWorkload.delayedTasks > 0 || pct >= 100);
                    
                    return (
                      <button
                        key={dev}
                        onClick={() => {
                          const updated = [...(data.team?.devTeam || []), dev];
                          setData({ ...data, team: { ...data.team, devTeam: updated } });
                        }}
                        className={`w-full text-left px-1.5 py-1 text-xs rounded hover:bg-green-50 transition-colors mb-0.5 ${
                          hasIssues ? 'bg-orange-50 border border-orange-200' : 'border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-gray-900 text-xs">{dev}</span>
                          <span className={`text-xs px-1 py-0.5 rounded font-semibold ${cl.color}`}>
                            {pct}%
                          </span>
                        </div>
                        {memberWorkload && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span>{memberWorkload.projectCount}/{memberWorkload.maxProjects} proj</span>
                            <span>•</span>
                            <span>{memberWorkload.activeTasks} tasks</span>
                            {memberWorkload.estimatedHours > 0 && (
                              <>
                                <span>•</span>
                                <span>{memberWorkload.estimatedHours}h</span>
                              </>
                            )}
                            {memberWorkload.delayedTasks > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-red-600 font-semibold">{memberWorkload.delayedTasks} delayed ⚠</span>
                              </>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Row 3: Dates and Phase */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Start Date *</label>
              <input 
                type="date" 
                value={data.startDate || ''} 
                onChange={e => setData({ ...data, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Decided End Date *</label>
              <input 
                type="date" 
                value={data.decidedEndDate || ''} 
                onChange={e => setData({ ...data, decidedEndDate: e.target.value, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Phase</label>
              <select 
                value={data.phase || 'Kickoff'} 
                onChange={e => setData({ ...data, phase: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                {phases.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4: Progress */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">Progress: {data.progress || 0}%</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={data.progress || 0}
              onChange={e => setData({ ...data, progress: +e.target.value })}
              className="w-full" 
            />
          </div>

          {/* Row 6: Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={data.isRetainer || false} 
                onChange={e => setData({ ...data, isRetainer: e.target.checked })}
                className="w-4 h-4" 
              />
              <span className="text-sm font-medium text-gray-700">Retainer</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={data.isStartingSoon || false} 
                onChange={e => setData({ ...data, isStartingSoon: e.target.checked })}
                className="w-4 h-4" 
              />
              <span className="text-sm font-medium text-gray-700">Starting Soon</span>
            </label>
          </div>

          {/* Template preview - show tasks that will be auto-created */}
          {data.type && (() => {
            const types = data.type.split(' + ').map(t => t.trim());
            const hasTemplates = types.some(t => projectTemplates[t]);
            if (!hasTemplates && !setCustomTasks) return null; // Only show if templates exist OR in add mode
            
            let taskCount = 0;
            types.forEach(t => {
              if (projectTemplates[t]) taskCount += projectTemplates[t].length;
            });
            
            const totalTasks = taskCount + (customTasks?.length || 0);
            
            return (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="text-indigo-600 mt-0.5">✨</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-indigo-900 mb-1">
                      {totalTasks} task{totalTasks !== 1 ? 's' : ''} will be auto-created
                    </div>
                    
                    {/* Template tasks */}
                    {hasTemplates && (
                      <div className="text-xs text-indigo-700 space-y-0.5 mb-2">
                        {types.map(type => {
                          const template = projectTemplates[type];
                          if (!template) return null;
                          return (
                            <div key={type}>
                              <span className="font-semibold">{type}:</span> {template.map(t => t.title).join(', ')}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Custom tasks list */}
                    {customTasks && customTasks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-semibold text-indigo-900">Custom tasks:</div>
                        {customTasks.map((ct, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1">
                            <span className="flex-1">{ct.title}</span>
                            <span className="text-gray-500">{ct.estimatedHours}h</span>
                            <button
                              onClick={() => setCustomTasks(customTasks.filter((_, i) => i !== idx))}
                              className="text-red-600 hover:text-red-800 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add custom task button - only show in add mode */}
                    {setCustomTasks && (
                      <button
                        onClick={() => {
                          const title = prompt('Task name:');
                          if (!title) return;
                          const hours = parseInt(prompt('Estimated hours:', '8'));
                          if (isNaN(hours)) return;
                          
                          setCustomTasks([...customTasks, {
                            title,
                            assignedTo: [],
                            dueDate: '',
                            status: 'backlog',
                            priority: 'medium',
                            estimatedHours: hours,
                            actualHours: null,
                            clientDelayDays: 0
                          }]);
                        }}
                        className="mt-2 text-xs bg-white text-indigo-700 px-3 py-1.5 rounded border border-indigo-300 hover:bg-indigo-100 font-semibold"
                      >
                        + Add Custom Task
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Notes - only show in Edit mode (after project is created) */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Notes</label>
              <textarea 
                value={data.notes || ''} 
                onChange={e => setData({ ...data, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
                rows="2"
                placeholder="Add project notes, context, or status updates..."
              />
            </div>
          )}

          {data.isStartingSoon && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Confirmed Start Date</label>
              <input 
                type="date" 
                value={data.confirmedStartDate || ''} 
                onChange={e => setData({ ...data, confirmedStartDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" 
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
          <button 
            onClick={onSave}
            disabled={!data.name || !data.type || !data.startDate || !data.decidedEndDate || !data.team?.am}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Save Project
          </button>
          <button 
            onClick={onCancel} 
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const TemplateCard = ({ template, onClose }) => (
    <div className="bg-white rounded-xl border-2 border-teal-500 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{template.name}</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-gray-700" /></button>
      </div>
      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm font-mono text-gray-700">
        Subject: {template.subject}
      </div>
      <div className="space-y-3">
        {Object.entries(template).filter(([k]) => !['name', 'subject'].includes(k)).map(([tone, content]) => (
          <div key={tone} className="border-2 border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">{tone}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(content); }}
                className="flex items-center text-sm font-semibold text-teal-600 hover:text-teal-700">
                <Copy className="w-4 h-4 mr-1" />Copy
              </button>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{content}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── AUTH HANDLERS ────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setLoggingIn(true);
    setLoginError('');
    const { data, error } = await supabaseAuth.signIn(loginEmail, loginPassword);
    if (error) {
      setLoginError(typeof error === 'string' ? error : 'Login failed. Check your credentials.');
      setLoggingIn(false);
      return;
    }
    // Map email to team member name so the app personalises correctly
    const member = teamMembers.find(m => m.email === (data.user && data.user.email));
    if (member) setCurrentUser(member.name);
    localStorage.setItem('sk_auth_token', data.access_token);
    localStorage.setItem('sk_auth_email', data.user.email);
    setAuthToken(data.access_token);
    setAuthEmail(data.user.email);
    setIsLoggedIn(true);
    setLoggingIn(false);
  };

  const handleLogout = async () => {
    if (authToken) await supabaseAuth.signOut(authToken);
    localStorage.removeItem('sk_auth_token');
    localStorage.removeItem('sk_auth_email');
    setAuthToken(null);
    setAuthEmail(null);
    setIsLoggedIn(false);
    setLoginEmail('');
    setLoginPassword('');
  };

  // ─── LOADING SKELETON ─────────────────────────────────────────────────────
  if (!authChecked || !dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <span className="text-white text-xl font-bold">SK</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Loading SpaceKayak…</span>
          </div>
          <div className="mt-6 space-y-2 w-64 mx-auto">
            {[80, 60, 72, 55].map((w, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded-full animate-pulse" style={{ width: `${w}%`, marginLeft: i % 2 ? 'auto' : '0' }}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white text-xl font-bold">SK</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SpaceKayak Ops</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="you@spacekayak.xyz"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {loginError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{loginError}</span>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loggingIn || !loginEmail || !loginPassword}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in…
                  </>
                ) : 'Sign in'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            SpaceKayak Operations Center · Internal use only
          </p>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header - with profile switcher and search */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-black tracking-tight">SK</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900 tracking-tight">SpaceKayak Operations</h1>
                {viewingAs && (
                  <div className="text-xs text-orange-600 font-medium">
                    Viewing as {viewingAs} • 
                    <button 
                      onClick={() => setViewingAs(null)}
                      className="ml-1 underline hover:text-orange-700"
                    >
                      Exit
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Search bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects, tasks, people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-1.5 pl-9 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none focus:bg-white transition-colors placeholder-gray-400"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Profile switcher + logout */}
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-400 font-medium tabular-nums">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>

              {/* Slack notification toast */}
              {slackToast && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  slackToast === 'sent'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {slackToast === 'sent' ? (
                    <>
                      {/* Slack hash icon */}
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                      </svg>
                      Sent to Slack
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Slack failed
                    </>
                  )}
                </div>
              )}

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign out
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                  <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">{currentUser[0]}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">{currentUser}</div>
                    <div className="text-xs text-gray-500">{getUserRole(currentUser) === 'admin' ? 'Admin' : getUserRole(currentUser) === 'am' ? 'Account Manager' : getUserRole(currentUser) === 'leadership' ? 'Leadership' : 'Team Member'}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                
                {/* Dropdown menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-2">
                    {/* Switch user (Admin/AM only) */}
                    {canViewAs(currentUser) && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Switch Profile</div>
                        {accountManagers.map(am => (
                          <button
                            key={am}
                            onClick={() => setCurrentUser(am)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${currentUser === am ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                          >
                            {am} {getUserRole(am) === 'admin' && '(Admin)'}
                          </button>
                        ))}
                        <div className="border-t border-gray-200 my-2"></div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">View As</div>
                        {allTeamMembers.filter(m => !accountManagers.includes(m)).map(member => (
                          <button
                            key={member}
                            onClick={() => setViewingAs(member)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${viewingAs === member ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-700'}`}
                          >
                            {member}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-60 flex-shrink-0">
            <div className="bg-gray-900 rounded-2xl overflow-hidden sticky top-6 flex flex-col">
              {/* Brand */}
              <div className="px-5 pt-5 pb-4 border-b border-white border-opacity-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-black tracking-tight">SK</span>
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold leading-tight">SpaceKayak</div>
                    <div className="text-gray-400 text-xs leading-tight">Ops Center</div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="p-3 space-y-0.5 flex-1">
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
                  { id: 'projects', icon: Target, label: 'Projects', count: projects.length },
                  { id: 'tasks', icon: List, label: 'Tasks', count: tasks.filter(t=>t.status!=='completed').length, alert: delayedCount() },
                  { id: 'capacity', icon: Users, label: 'Capacity', count: allTeamMembers.length },
                  { id: 'timeline', icon: Calendar, label: 'Timeline' },
                  { id: 'risk', icon: AlertTriangle, label: 'Risk & Resources' },
                  { id: 'crisis', icon: AlertCircle, label: 'Crisis Nav' },
                  ...(canEditProjects(currentUser) ? [{ id: 'team', icon: Users, label: 'Team', count: activeMembers.length }] : []),
                ].map(({ id, icon: Icon, label, count, alert }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-all rounded-lg ${
                      activeTab === id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-white hover:bg-opacity-10 hover:text-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {count !== undefined && (
                        <span className={`text-xs font-semibold tabular-nums ${activeTab === id ? 'text-indigo-200' : 'text-gray-600'}`}>
                          {count}
                        </span>
                      )}
                      {alert > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {alert}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="mx-3 mb-3 p-3 bg-white bg-opacity-5 rounded-xl space-y-2 text-xs border border-white border-opacity-5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Active Projects</span>
                  <span className="font-semibold text-gray-200">{projects.filter(p=>p.phase!=='Complete').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Open Tasks</span>
                  <span className="font-semibold text-gray-200">{tasks.filter(t=>t.status!=='completed').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Delayed</span>
                  <span className={`font-bold ${delayedCount() > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {delayedCount()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'projects' && renderProjects()}
            {activeTab === 'tasks' && renderTasks()}
            {activeTab === 'capacity' && renderCapacity()}
            {activeTab === 'timeline' && renderTimeline()}
            {activeTab === 'risk' && renderRiskAndResources()}
            {activeTab === 'crisis' && renderCrisis()}
            {activeTab === 'team' && renderTeam()}
          </div>
        </div>

        {/* Log Hours Modal */}
        {loggingHoursTask && (() => {
          const task = tasks.find(t => t.id === loggingHoursTask);
          if (!task) return null;
          const project = projects.find(p => p.id === task.projectId);
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
              <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
                <h3 className="text-2xl font-black mb-2">Task Complete! 🎉</h3>
                <p className="text-gray-600 mb-6">How many hours did this take?</p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="font-bold text-gray-900 mb-1">{task.title}</div>
                  <div className="text-sm text-gray-600">{project?.name}</div>
                  {task.estimatedHours && (
                    <div className="text-sm text-teal-600 font-semibold mt-2">
                      Estimated: {task.estimatedHours}h
                    </div>
                  )}
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Actual Hours Worked</label>
                  <input
                    type="number"
                    value={loggedHours}
                    onChange={e => setLoggedHours(e.target.value)}
                    placeholder="e.g., 8.5"
                    step="0.5"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none text-lg"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={logHours}
                    disabled={!loggedHours || parseFloat(loggedHours) <= 0}
                    className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Log {loggedHours || '0'}h & Complete
                  </button>
                  <button
                    onClick={skipLoggingHours}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => setLoggingHoursTask(null)}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Client Delay Modal */}
        {clientDelayTask && (() => {
          const task = tasks.find(t => t.id === clientDelayTask);
          if (!task) return null;
          const project = projects.find(p => p.id === task.projectId);
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
              <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
                <h3 className="text-2xl font-black mb-2">Client Delay ⏸️</h3>
                <p className="text-gray-600 mb-6">How many days is the client delaying this task?</p>
                
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
                  <div className="font-bold text-gray-900 mb-1">{task.title}</div>
                  <div className="text-sm text-gray-600 mb-2">{project?.name}</div>
                  <div className="text-sm text-gray-600">
                    Current deadline: <span className="font-bold">{fmt(project?.endDate)}</span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Days Delayed by Client</label>
                  <input
                    type="number"
                    value={clientDelayDays}
                    onChange={e => setClientDelayDays(e.target.value)}
                    placeholder="e.g., 5"
                    step="1"
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none text-lg"
                    autoFocus
                  />
                  {clientDelayDays && parseInt(clientDelayDays) > 0 && project && (() => {
                    const newDate = new Date(project.endDate);
                    newDate.setDate(newDate.getDate() + parseInt(clientDelayDays));
                    return (
                      <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                        <span className="font-bold text-gray-700">New project deadline: </span>
                        <span className="font-black text-indigo-700">{fmt(newDate.toISOString().split('T')[0])}</span>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={logClientDelay}
                    disabled={!clientDelayDays || parseInt(clientDelayDays) <= 0}
                    className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Log {clientDelayDays || '0'} Day Delay
                  </button>
                  <button
                    onClick={() => { setClientDelayTask(null); setClientDelayDays(''); }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Workload Warning Modal */}
        {workloadWarning && (() => {
          const { taskId, personName, warningData } = workloadWarning;
          const task = tasks.find(t => t.id === taskId);
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
              <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl">
                {warningData.warning ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">High Workload Warning</h3>
                    </div>
                    
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-gray-700 font-medium">{warningData.message}</p>
                    </div>

                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Current Tasks:</div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {warningData.tasks.map((t, i) => (
                          <div key={i} className="text-sm text-gray-600 flex items-center justify-between py-1">
                            <span className="truncate">{t.title}</span>
                            <span className="text-xs text-gray-500 ml-2">{fmt(t.dueDate)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-6">
                      Do you want to proceed with assigning this task to {personName}?
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Workload Suggestion</h3>
                    </div>
                    
                    <div className="mb-6 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-sm text-gray-700">{warningData.suggestion}</p>
                    </div>
                  </>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      updateTask(taskId, { assignedTo: [personName] });
                      setReassigningTask(null);
                      setWorkloadWarning(null);
                    }}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Assign to {personName}
                  </button>
                  <button
                    onClick={() => setWorkloadWarning(null)}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Choose Different Person
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SpaceKayakOpsCenter;
