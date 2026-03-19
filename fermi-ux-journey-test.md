# Fermi — Full UX Journey Test Report
**Date:** 2026-03-19 · **Branch:** `fermi/design-audit-and-fixes` · **Commit:** `0292615`

---

## Methodology

Traced all four user roles through their complete daily workflows by reading every component, context, and data-flow path end-to-end. Verified: auth flows, role gates, CRUD operations, modal trigger/dismiss chains, sidebar counts, navigation drill-downs, and search.

---

## Role 1: Achyut (admin)

**Login → Dashboard**
- ✅ Email/password form, @spacekayak.xyz domain gate enforced
- ✅ `login()` sets authToken + authEmail; DataContext resolves currentUser from team member email match
- ✅ Manager dashboard: stat cards (Active Projects, Overdue Tasks, Due This Week, Team Overloaded)
- ✅ Each stat card drills down to correct tab + filter
- ✅ "Filter by member" dropdown visible; "Show Archived" button visible
- ✅ Portfolio Health shows all projects; ProjectCard has Edit + Archive controls

**Projects Tab**
- ✅ "New Project" button visible; Add Project modal opens with template task generation
- ✅ Edit project: modal opens pre-filled, `updateProject(full_object)` single-arg call correct
- ✅ Delete: inline confirmation banner, toast on confirm, tasks cascade-deleted
- ✅ Search filters by name/type/AM/phase

**Tasks Tab**
- ✅ All tasks visible (isManager = true)
- ✅ "New Task" button visible; pill-based assignee selector; dependency picker
- ✅ Checkbox: checks `needsHoursLog` → opens LogHoursModal ✅
- ✅ Status dropdown: checks both `needsHoursLog` and `needsDelayLog` ✅
- ✅ Edit controls (Edit2, Trash2) visible and gated on canEdit
- ✅ Inline delete confirmation banner with toast
- ✅ Global search filters across title, project name, assignees

**LogHoursModal**
- ✅ Opens correctly from checkbox and dropdown
- ✅ Hours input, variance preview (green/orange/indigo)
- ✅ "Log Xh & Complete" → `completeTaskWithHours()` + `advanceNext()` → closes
- ✅ **FIXED (Bug 1):** "Skip" → `updateTask(..., { status: 'completed', manualStatus: true })` now bypasses the early return (was silently failing before fix)

**ClientDelayModal**
- ✅ Opens when status dropdown set to "client-delay" on a task with clientDelayDays === 0
- ✅ Days input, new deadline preview
- ✅ `logClientDelay()` updates task + pushes project end date

**Capacity Tab**
- ✅ All members visible sorted by capacity %
- ✅ Filter tabs (All / Overloaded / At Capacity / Has Headroom / Available)
- ✅ This Week / Next Week toggle
- ✅ Expand member → next deadline countdown, active task list
- ✅ **FIXED (Bug 3):** Complete button now reads return value → opens LogHoursModal (was silently failing before fix)
- ✅ Reassign picker gated on canEdit; workload warning check before reassign

**Timeline Tab**
- ✅ Gantt bars are buttons; click navigates to Tasks tab filtered by project
- ✅ Wrapped in overflow-x-auto for mobile

**Risk Tab**
- ✅ Shows tasks assessed by risk score (overdue, blocked, overloaded assignees, critical priority)

**Crisis Nav Tab**
- ✅ At-risk projects panel: projects with <14 days left or delayed tasks shown as quick-select buttons
- ✅ Smart category selection: >2 delayed tasks → "resource"; else → "project"
- ✅ "Planning for: [Project]" banner with dismiss button in scenario picker
- ✅ Scenario → flexibility sliders → Generate Action Plan → recommendation with team context, playbook, comms template

**Settings Tab**
- ✅ Accessible via sidebar

**Logout**
- ✅ Header "Sign out" button → `logout()` clears token, authEmail, currentUser, localStorage

---

## Role 2: Hari / Neel (Account Manager, sysRole: 'am')

- ✅ Login, dashboard, portfolio health — same as admin (canViewAllProjects = true)
- ✅ "New Project" / "New Task" / Edit / Delete controls visible (canEditProjects = true)
- ✅ No admin-only UI differences (AM and admin have identical control access)
- ✅ "View As" dropdown available in header profile menu (canViewAs = true)
- ✅ "Switch Profile" section in dropdown shows AMs only
- ✅ Sidebar: counts all tasks (isManager = true)

---

## Role 3: Paul / Saaket (leadership, sysRole: 'leadership')

- ✅ Login → dashboard shows manager view (canViewAllProjects = true)
- ✅ Stat cards + portfolio health with all projects
- ✅ "Show Archived" button visible (canViewAllProjects used, not canEditProjects — corrected in last session)
- ✅ "Filter by member" dropdown visible
- ✅ **No "New Project" / "New Task"** buttons (canEditProjects = false) ✅
- ✅ **No Edit / Delete / Reassign** controls ✅
- ✅ Read-only access to Capacity, Risk, Timeline, Crisis Nav ✅
- ✅ **No "Team" tab** in sidebar (only shown for canEditProjects)
- ✅ **No "View As"** in profile dropdown (canViewAs = false) ✅
- ✅ Sidebar: counts all tasks (isManager = true via canViewAllProjects)

---

## Role 4: Navaneeth (team_member, sysRole: 'team_member')

**Auth (Sign Up flow)**
- ✅ Tab toggle "Sign up" visible on AuthScreen
- ✅ Validation: @spacekayak.xyz domain, ≥8 chars, password match
- ✅ Success screen: "Check your inbox" with email shown
- ✅ **FIXED (Bug 4):** If Supabase auto-confirms (returns access_token immediately), `setAuthEmail(email)` is now called so `currentUser` resolves correctly. Previously the user landed on a nameless dashboard with no role.

**Dashboard (team_member view)**
- ✅ Sees personal dashboard: "Your Active Tasks" + "Due This Week" + "Your Projects"
- ✅ Only own tasks visible (filtered by assignedTo includes currentUser)
- ✅ Only projects where they have assigned tasks visible
- ✅ No "Filter by member" or "Show Archived" dropdowns
- ✅ Task completion circle → checks needsHoursLog → opens LogHoursModal ✅
- ✅ **FIXED (Bug 2):** Status dropdown now also handles needsHoursLog (was silent before fix)

**Tasks Tab**
- ✅ Only own tasks shown (isManager = false → filters by currentUser)
- ✅ **No "New Task" button** (canEdit = false) ✅
- ✅ **No Edit / Delete controls** ✅
- ✅ Status dropdown still works (team members can update their own task status)

**Sidebar counts**
- ✅ Open tasks count = own tasks only (myTasks scoped by assignedTo)
- ✅ Delayed badge = own overdue tasks only

**Capacity / Risk / Timeline / Crisis**
- ✅ All visible and readable (no canViewAllProjects gate on these views)
- ✅ No reassign/edit controls in Capacity (canEdit = false)

**Team Tab**
- ✅ Not visible in sidebar (canEditProjects = false)

---

## Bugs Found & Fixed

| # | Severity | File | Description | Status |
|---|----------|------|-------------|--------|
| 1 | **Critical** | `DataContext.jsx` | `LogHoursModal` Skip button silently failed — `updateTask` early-returned `needsHoursLog` even when `manualStatus: true` was passed | ✅ Fixed |
| 2 | **High** | `DashboardView.jsx` | Team member task status dropdown only checked `needsDelayLog`, not `needsHoursLog` — selecting "Completed" did nothing | ✅ Fixed |
| 3 | **High** | `CapacityView.jsx` | Complete-task button discarded `updateTask` return value — LogHoursModal never opened from Capacity view | ✅ Fixed |
| 4 | **Medium** | `AuthContext.jsx` | `signup()` set localStorage email but never called `setAuthEmail()` — after auto-confirm signup, `currentUser` stayed null | ✅ Fixed |

---

## No-Issue Items (audited, confirmed correct)

- `updateTask` early return for `client-delay` only fires on `clientDelayDays === 0` — intentional, prevents double-logging
- DashboardView and TasksView show all projects to all users in Projects tab — intentional team visibility
- `viewingAs` mode: edit controls stay based on real user, not viewed user — correct preview-mode design
- Header "Switch Profile" shows AMs; "View As" shows non-AMs — correct segmentation
- Timeline click-through navigates to tasks with project filter — wired correctly
- Slack notification toasts fire on task assign and delay — wired in DataContext, displays in Header

---

## Updated Files (this session)
- `src/contexts/DataContext.jsx`
- `src/components/dashboard/DashboardView.jsx`
- `src/components/capacity/CapacityView.jsx`
- `src/contexts/AuthContext.jsx`

**New zip:** `fermi-src-v2.zip`
