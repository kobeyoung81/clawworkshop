import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { TopNavbar } from './components/layout/TopNavbar';
import { Dashboard } from './pages/Dashboard';
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
  return (
    <div className="min-h-screen bg-bg text-text font-body selection:bg-accent-cyan/30 selection:text-accent-cyan">
      <TopNavbar variant={variant} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
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
      />
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
