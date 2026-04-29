import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { fetchReadiness, fetchRuntimeConfig } from '../api/system.ts'
import { fallbackRuntimeConfig } from '../config.ts'
import { useCurrentActor } from '../hooks/useCurrentActor.ts'
import { LanguageToggle } from './LanguageToggle.tsx'
import { SystemStatusBadge } from './SystemStatusBadge.tsx'
import { useTranslation } from 'react-i18next'
import { getDashboardAuthHref } from '../utils/authLinks.ts'

export function Navbar() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
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

  const authLinkHref = useMemo(() => getDashboardAuthHref(runtimeConfig), [runtimeConfig])

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

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-cw-border bg-cw-bg/88 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <a href={runtimeConfig.portalBaseUrl} className="group flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cw-cyan/20 bg-cw-cyan/10 text-cw-cyan transition-colors group-hover:bg-cw-cyan/15">
              <span className="font-display text-base font-bold">L</span>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-cw-text">
              <span className="text-cw-cyan">Los</span>Claws
            </span>
          </a>

          <div className="inline-flex items-center gap-2 rounded-full border border-cw-purple/20 bg-cw-purple/10 px-3 py-1.5">
            <span className="text-sm text-cw-purple">⚡</span>
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-cw-text sm:text-xs">
              ClawWorkshop
            </span>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <div className="shrink-0">
            <LanguageToggle />
          </div>
          <div className="hidden sm:block">
            <SystemStatusBadge status={systemStatus} />
          </div>
          <div className="sm:hidden">
            <SystemStatusBadge status={systemStatus} compact />
          </div>

          {currentActorQuery.isLoading ? (
            <span className="text-xs font-mono text-cw-text-muted">...</span>
          ) : actor ? (
            <div className="flex min-w-0 items-center gap-2">
              <a
                href={`${runtimeConfig.portalBaseUrl}/user.html`}
                className="max-w-[7rem] truncate rounded-full border border-cw-cyan/15 bg-cw-cyan/5 px-3 py-1.5 text-[11px] font-mono text-cw-cyan transition-colors hover:border-cw-cyan/30 hover:bg-cw-cyan/10 sm:max-w-[10rem] sm:text-xs"
              >
                {actorLabel}
              </a>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="rounded-full border border-cw-magenta/25 px-3 py-1.5 text-[11px] font-mono text-cw-text-muted transition-colors hover:border-cw-magenta hover:text-cw-magenta disabled:opacity-60 sm:text-xs"
              >
                {logoutMutation.isPending ? '...' : t('nav.logout')}
              </button>
            </div>
          ) : (
            <a
              href={authLinkHref}
              className="rounded-full border border-cw-cyan/20 bg-cw-cyan/5 px-3 py-1.5 text-[11px] font-mono text-cw-text-muted transition-colors hover:border-cw-cyan/30 hover:text-cw-text sm:text-xs"
            >
              {t('nav.signIn')}
            </a>
          )}
        </div>
      </div>

      {authMessage ? (
        <div className="border-t border-cw-border bg-cw-bg/60 px-4 py-2 text-center text-xs text-cw-amber sm:px-6 lg:px-8">
          {authMessage}
        </div>
      ) : null}
    </nav>
  )
}
