import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getCurrentActor } from '../../api/dashboard';
import { getDistrictStats } from '../../api/public';
import { getPortalBase, getSignInUrl } from '../../config';
import { useI18n } from '../../i18n';
import type { CurrentActorResponse, DistrictStatsResponse } from '../../types';

interface TopNavbarProps {
  variant?: 'landing' | 'dashboard' | 'flowhub' | 'design';
}

function overviewHref(variant: 'landing' | 'dashboard' | 'flowhub' | 'design'): string {
  return variant === 'landing' ? '#overview' : '/#overview';
}

function navLinkClass(active: boolean): string {
  return `px-4 py-2 text-sm font-medium transition-colors ${active ? 'text-accent-cyan' : 'text-text-muted hover:text-accent-cyan'}`;
}

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

function PortalLink() {
  const { t } = useI18n();
  const portalBase = getPortalBase();

  return (
    <a
      href={portalBase || 'https://losclaws.com'}
      className="hidden items-center gap-1.5 text-sm font-display font-semibold tracking-tight text-white transition-opacity hover:opacity-85 lg:flex"
    >
      <span>Los</span>
      <span className="text-accent-cyan">Claws</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">{t('nav.portal_suffix')}</span>
    </a>
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

export function TopNavbar({ variant = 'landing' }: TopNavbarProps) {
  const { t } = useI18n();
  const signInUrl = getSignInUrl(variant === 'design' ? '/design' : variant === 'flowhub' ? '/flowhub' : '/dashboard');
  const actorQuery = useQuery<CurrentActorResponse>({
    queryKey: ['current-actor'],
    queryFn: getCurrentActor,
    retry: false,
    staleTime: 60_000,
  });
  const actorName = actorQuery.data?.actor.name?.trim() || actorQuery.data?.actor.email?.trim() || actorQuery.data?.actor.id;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center rounded bg-accent-cyan/10 text-accent-cyan ring-1 ring-accent-cyan/20 transition-all group-hover:bg-accent-cyan/20 group-hover:ring-accent-cyan/50">
              <span className="text-lg font-bold">W</span>
            </div>
            <div className="font-display text-lg font-bold leading-none tracking-tight text-white">
              Claw<span className="text-accent-cyan">Workshop</span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <a href={overviewHref(variant)} className={navLinkClass(variant === 'landing')}>
              {t('nav.overview')}
            </a>
            <Link to="/dashboard" className={navLinkClass(variant === 'dashboard')}>
              {t('nav.dashboard')}
            </Link>
            <Link to="/flowhub" className={navLinkClass(variant === 'flowhub')}>
              {t('nav.flowhub')}
            </Link>
            <Link to="/design" className={navLinkClass(variant === 'design')}>
              {t('nav.design')}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <PortalLink />
          <LangToggle />
          <StatusBadge />
          {actorName ? (
            <Link
              to="/dashboard"
              className="hidden rounded border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-1 text-xs font-mono text-accent-cyan transition-colors hover:border-accent-cyan/40 hover:text-white md:block"
            >
              {actorName}
            </Link>
          ) : (
            <a
              href={signInUrl}
              className="hidden rounded border border-accent-cyan/20 px-3 py-1 text-xs font-mono text-text-muted transition-colors hover:border-accent-cyan/40 hover:text-white md:block"
            >
              {t('nav.sign_in')}
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
