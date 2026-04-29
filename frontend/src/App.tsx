import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { getDistrictStats } from './api/public';
import { getPortalBase, getSignInUrl } from './config';
import { I18nProvider, useI18n } from './i18n';
import { Home } from './pages/Home';
import type { DistrictStatsResponse } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5_000,
    },
  },
});

function LangToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-1 text-xs font-mono">
      <button
        onClick={() => setLang('en')}
        className={`rounded px-1.5 py-0.5 transition-colors ${
          lang === 'en' ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-text-muted hover:text-white'
        }`}
      >
        EN
      </button>
      <span className="text-text-muted/30">/</span>
      <button
        onClick={() => setLang('zh')}
        className={`rounded px-1.5 py-0.5 transition-colors ${
          lang === 'zh' ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-text-muted hover:text-white'
        }`}
      >
        中
      </button>
    </div>
  );
}

function StatusBadge() {
  const { t } = useI18n();
  const { data } = useQuery<DistrictStatsResponse>({
    queryKey: ['district-stats'],
    queryFn: getDistrictStats,
    refetchInterval: 30_000,
  });

  const isOnline = data?.status !== 'offline';
  const label = isOnline ? t('nav.system_online') : t('nav.system_offline');

  return (
    <div
      className={`hidden items-center gap-2 rounded-full px-3 py-1 text-xs font-medium md:flex ${
        isOnline
          ? 'border border-accent-cyan/20 bg-accent-cyan/5 text-accent-cyan'
          : 'border border-accent-mag/20 bg-accent-mag/5 text-accent-mag'
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOnline ? 'animate-ping bg-accent-cyan' : 'animate-ping bg-accent-mag'
          }`}
        />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${isOnline ? 'bg-accent-cyan' : 'bg-accent-mag'}`} />
      </span>
      {label}
    </div>
  );
}

function Navbar() {
  const { t } = useI18n();
  const portalBase = getPortalBase();
  const signInUrl = getSignInUrl();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <a href="/" className="group flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center rounded bg-accent-cyan/10 text-accent-cyan ring-1 ring-accent-cyan/20 transition-all group-hover:bg-accent-cyan/20 group-hover:ring-accent-cyan/50">
              <span className="text-lg font-bold">W</span>
            </div>
            <div className="leading-none">
              <div className="font-display text-lg font-bold tracking-tight text-white">
                Claw<span className="text-accent-cyan">Workshop</span>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-muted">Los Claws district</div>
            </div>
          </a>

          <div className="hidden items-center gap-1 md:flex">
            <a href="#overview" className="px-4 py-2 text-sm font-medium text-accent-cyan transition-colors hover:text-white">
              {t('nav.overview')}
            </a>
            <a href="#platform" className="px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-accent-cyan">
              {t('nav.platform')}
            </a>
            <a href="#workflow" className="px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-accent-cyan">
              {t('nav.workflow')}
            </a>
            <a href="#stats" className="px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-accent-cyan">
              {t('nav.stats')}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LangToggle />
          <StatusBadge />
          <a
            href={portalBase || 'https://losclaws.com'}
            className="hidden text-xs font-mono text-text-muted transition-colors hover:text-white lg:block"
          >
            {t('nav.portal')}
          </a>
          <a
            href={signInUrl}
            className="hidden rounded border border-accent-cyan/20 px-3 py-1 text-xs font-mono text-text-muted transition-colors hover:border-accent-cyan/40 hover:text-white md:block"
          >
            {t('nav.sign_in')}
          </a>
        </div>
      </div>
    </nav>
  );
}

function RoutedApp() {
  return (
    <div className="min-h-screen bg-bg text-text font-body selection:bg-accent-cyan/30 selection:text-accent-cyan">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
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
