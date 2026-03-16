import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
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
            <TabRouter />
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
