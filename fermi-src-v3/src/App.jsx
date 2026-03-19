import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { UIProvider, useUI } from './contexts/UIContext';
import AppShell from './components/layout/AppShell';
import AuthScreen from './components/auth/AuthScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import DashboardView from './components/dashboard/DashboardView';
import ProjectsView from './components/projects/ProjectsView';
import TasksView from './components/tasks/TasksView';
import CapacityView from './components/capacity/CapacityView';
import TimelineView from './components/timeline/TimelineView';
import RiskView from './components/risk/RiskView';
import CrisisView from './components/crisis/CrisisView';
import TeamView from './components/team/TeamView';
import SettingsView from './components/settings/SettingsView';

function TabRouter() {
  const { activeTab } = useUI();

  switch (activeTab) {
    case 'dashboard': return <DashboardView />;
    case 'projects': return <ProjectsView />;
    case 'tasks': return <TasksView />;
    case 'capacity': return <CapacityView />;
    case 'timeline': return <TimelineView />;
    case 'risk': return <RiskView />;
    case 'crisis': return <CrisisView />;
    case 'team': return <TeamView />;
    case 'settings': return <SettingsView />;
    default: return <DashboardView />;
  }
}

// FIX P1-3: gate content on dataLoaded so users never see a stale seed flash
function DataGate({ children }) {
  const { dataLoaded, currentUser } = useData();
  const { authEmail } = useAuth();

  // Show spinner until Supabase has loaded AND currentUser has been resolved from email
  const ready = dataLoaded && (currentUser || !authEmail);

  if (!ready) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-stone-200 rounded-[5px]" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-stone-200 rounded-[6px]" />)}
        </div>
        <div className="h-40 bg-stone-200 rounded-[6px]" />
        <div className="h-24 bg-stone-200 rounded-[6px]" />
      </div>
    );
  }

  return children;
}

function AuthGate() {
  const { isLoggedIn, authChecked } = useAuth();

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 text-sm font-mono tracking-wide">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) return <AuthScreen />;

  return (
    <DataProvider>
      <UIProvider>
        <AppShell>
          <ErrorBoundary>
            <DataGate>           {/* FIX P1-3: wrap content in loading gate */}
              <TabRouter />
            </DataGate>
          </ErrorBoundary>
        </AppShell>
      </UIProvider>
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
