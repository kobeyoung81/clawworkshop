import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { fetchReadiness, fetchRuntimeConfig } from '../api/system.ts'
import { fallbackRuntimeConfig } from '../config.ts'
import { useCurrentActor } from '../hooks/useCurrentActor.ts'
import { LanguageToggle } from './LanguageToggle.tsx'
import { SystemStatusBadge } from './SystemStatusBadge.tsx'
import { useTranslation } from 'react-i18next'

type NavItem = {
  to: string
  key: string
}

const navItems: NavItem[] = [
  { to: '/', key: 'overview' },
  { to: '/dashboard', key: 'dashboard' },
  { to: '/workspaces', key: 'workspaces' },
  { to: '/templates', key: 'templates' },
  { to: '/projects', key: 'projects' },
  { to: '/flows', key: 'flows' },
  { to: '/activity', key: 'activity' },
]

export function Navbar() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  const runtimeConfigQuery = useQuery({
    queryKey: ['runtime-config'],
    queryFn: fetchRuntimeConfig,
    staleTime: Infinity,
  })
  const currentActorQuery = useCurrentActor()
  const readinessQuery = useQuery({
    queryKey: ['health'],
    queryFn: fetchReadiness,
    refetchInterval: 30_000,
  })

  const runtimeConfig = runtimeConfigQuery.data ?? fallbackRuntimeConfig
  const actor = currentActorQuery.data

  const authLinkHref = useMemo(() => {
    const redirect = typeof window === 'undefined' ? runtimeConfig.frontendUrl : window.location.href
    return `${runtimeConfig.portalBaseUrl}/auth.html?redirect=${encodeURIComponent(redirect)}`
  }, [runtimeConfig.frontendUrl, runtimeConfig.portalBaseUrl])

  const actorLabel = actor?.name?.trim() || actor?.email?.trim() || (actor ? `@${actor.id.slice(0, 8)}` : '')
  const systemStatus =
    readinessQuery.data?.status === 'ok' ? 'ok' : readinessQuery.data?.status === 'degraded' ? 'degraded' : 'loading'

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${runtimeConfig.authBaseUrl}/auth/v1/humans/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to log out.')
      }
    },
    onSuccess: async () => {
      setAuthMessage(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['current-actor'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['task-inbox'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
        queryClient.invalidateQueries({ queryKey: ['project-types'] }),
      ])
    },
    onError: () => {
      setAuthMessage('Failed to log out.')
    },
  })

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'text-cw-cyan' : 'text-cw-text-muted hover:text-cw-text',
    ].join(' ')

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-cw-border bg-cw-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <a href={runtimeConfig.portalBaseUrl} className="group flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-cw-text">
              <span className="text-cw-cyan">Los</span>Claws
            </span>
          </a>

          <div className="hidden items-center gap-3 md:flex">
            <div className="inline-flex items-center gap-2 rounded-md border border-cw-purple/20 bg-cw-purple/10 px-3 py-1.5">
              <span className="text-sm text-cw-purple">⚡</span>
              <span className="font-display text-sm font-bold uppercase tracking-[0.16em] text-cw-text">ClawWorkshop</span>
            </div>

            <div className="hidden items-center md:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {t(`nav.${item.key}`)}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <LanguageToggle />
          </div>
          <div className="hidden lg:block">
            <SystemStatusBadge status={systemStatus} />
          </div>

          {currentActorQuery.isLoading ? (
            <span className="hidden text-xs font-mono text-cw-text-muted md:inline">...</span>
          ) : actor ? (
            <div className="hidden items-center gap-3 md:flex">
              <a
                href={`${runtimeConfig.portalBaseUrl}/user.html`}
                className="text-xs font-mono text-cw-cyan transition-opacity hover:opacity-80"
              >
                {actorLabel}
              </a>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="border border-cw-magenta/25 px-3 py-1.5 text-xs font-mono text-cw-text-muted transition-colors hover:border-cw-magenta hover:text-cw-magenta disabled:opacity-60"
              >
                {logoutMutation.isPending ? '...' : t('nav.logout')}
              </button>
            </div>
          ) : (
            <a
              href={authLinkHref}
              className="hidden text-xs font-mono text-cw-text-muted transition-colors hover:text-cw-text md:inline"
            >
              {t('nav.signIn')}
            </a>
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center border border-cw-border text-cw-text-muted transition-colors hover:text-cw-text md:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            aria-expanded={mobileOpen}
            aria-controls="workshop-mobile-nav"
            aria-label="Toggle navigation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {authMessage ? (
        <div className="border-t border-cw-border bg-cw-bg/60 px-4 py-2 text-center text-xs text-cw-amber sm:px-6 lg:px-8">
          {authMessage}
        </div>
      ) : null}

      {mobileOpen ? (
        <div id="workshop-mobile-nav" className="border-t border-cw-border bg-cw-bg/95 px-4 py-4 md:hidden">
          <div className="mb-4 flex items-center justify-between gap-3">
            <LanguageToggle />
            <SystemStatusBadge status={systemStatus} />
          </div>

          <div className="flex flex-col border border-cw-border bg-cw-surface">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `${linkClass({ isActive })} border-b border-cw-border last:border-b-0`}
              >
                {t(`nav.${item.key}`)}
              </NavLink>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border border-cw-border bg-cw-surface px-3 py-3">
            {actor ? (
              <>
                <a
                  href={`${runtimeConfig.portalBaseUrl}/user.html`}
                  className="text-xs font-mono text-cw-cyan"
                  onClick={() => setMobileOpen(false)}
                >
                  {actorLabel}
                </a>
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="border border-cw-magenta/25 px-3 py-1.5 text-xs font-mono text-cw-text-muted"
                >
                  {logoutMutation.isPending ? '...' : t('nav.logout')}
                </button>
              </>
            ) : (
              <a href={authLinkHref} className="text-xs font-mono text-cw-text-muted" onClick={() => setMobileOpen(false)}>
                {t('nav.signIn')}
              </a>
            )}
          </div>
        </div>
      ) : null}
    </nav>
  )
}
