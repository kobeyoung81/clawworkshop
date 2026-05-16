import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { TopNavbar } from './components/layout/TopNavbar';
import { Dashboard } from './pages/Dashboard';
import { DashboardHomeView } from './pages/dashboard/DashboardHomeView';
import { ProjectCreateView } from './pages/dashboard/ProjectCreateView';
import { ProjectView } from './pages/dashboard/ProjectView';
import { TaskView } from './pages/dashboard/TaskView';
import { WorkspaceView } from './pages/dashboard/WorkspaceView';
import { Home } from './pages/Home';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5_000,
    },
  },
});

function PageFrame({
  variant,
  children,
}: {
  variant: 'landing' | 'dashboard';
  children: ReactNode;
}) {
  const mainClassName =
    variant === 'dashboard'
      ? 'w-full px-4 py-8 sm:px-6 lg:px-8'
      : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8';

  return (
    <div className="min-h-screen bg-bg text-text font-body selection:bg-accent-cyan/30 selection:text-accent-cyan">
      <TopNavbar variant={variant} />
      <main className={mainClassName}>{children}</main>
    </div>
  );
}

function RoutedApp() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PageFrame variant="landing">
            <Home />
          </PageFrame>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PageFrame variant="dashboard">
            <Dashboard />
          </PageFrame>
        }
      >
        <Route index element={<DashboardHomeView />} />
        <Route path="workspaces/:workspaceId" element={<WorkspaceView />} />
        <Route path="workspaces/:workspaceId/projects/new" element={<ProjectCreateView />} />
        <Route path="projects/:projectId" element={<ProjectView />} />
        <Route path="tasks/:taskId" element={<TaskView />} />
      </Route>
      <Route
        path="*"
        element={
          <PageFrame variant="landing">
            <Home />
          </PageFrame>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <RoutedApp />
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
