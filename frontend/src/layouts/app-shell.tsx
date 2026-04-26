import { useQuery } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'
import { fetchCurrentActor, fetchReadiness, fetchRuntimeConfig } from '../api/system.ts'
import { LanguageToggle } from '../components/language-toggle.tsx'
import { SystemStatusBadge } from '../components/system-status-badge.tsx'
import { fallbackRuntimeConfig } from '../config.ts'
import { useTranslation } from 'react-i18next'

const navigation = [
  { to: '/', key: 'overview' },
  { to: '/workspaces', key: 'workspaces' },
  { to: '/templates', key: 'templates' },
  { to: '/projects', key: 'projects' },
  { to: '/flows', key: 'flows' },
  { to: '/activity', key: 'activity' },
] as const

export function AppShell({ children }: PropsWithChildren) {
  const { t } = useTranslation()
  const runtimeConfigQuery = useQuery({
    queryKey: ['runtime-config'],
    queryFn: fetchRuntimeConfig,
    staleTime: Infinity,
  })
  const readinessQuery = useQuery({
    queryKey: ['readiness'],
    queryFn: fetchReadiness,
    refetchInterval: 30_000,
    retry: false,
  })
  const actorQuery = useQuery({
    queryKey: ['current-actor'],
    queryFn: fetchCurrentActor,
  })

  const runtimeConfig = runtimeConfigQuery.data ?? fallbackRuntimeConfig
  const status = readinessQuery.isLoading
    ? 'loading'
    : readinessQuery.data?.status === 'ok'
      ? 'ok'
      : 'degraded'

  return (
    <div className="min-h-screen bg-transparent text-cw-text">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-cw-border bg-cw-panel p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-cw-cyan">
                  {t('shell.eyebrow')}
                </p>
                <div className="space-y-2">
                  <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                    {t('shell.title')}
                  </h1>
                  <p className="max-w-3xl text-base text-cw-muted sm:text-lg">
                    {t('shell.subtitle')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <SystemStatusBadge status={status} />
                <LanguageToggle />
                <a
                  href={runtimeConfig.portalBaseUrl}
                  className="rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan transition hover:bg-cw-cyan/20"
                >
                  {t('shell.signIn')}
                </a>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'rounded-full border px-4 py-2 text-sm transition',
                      isActive
                        ? 'border-cw-magenta/40 bg-cw-magenta/15 text-white'
                        : 'border-cw-border bg-white/5 text-cw-muted hover:border-cw-cyan/30 hover:text-cw-text',
                    ].join(' ')
                  }
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 py-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
            <div className="space-y-6">{children}</div>

            <aside className="space-y-6">
              <section className="rounded-[24px] border border-cw-border bg-cw-panel p-5 backdrop-blur">
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">
                  Runtime config
                </p>
                <dl className="mt-4 space-y-3 text-sm text-cw-muted">
                  <div>
                    <dt className="text-white">Frontend</dt>
                    <dd>{runtimeConfig.frontendUrl}</dd>
                  </div>
                  <div>
                    <dt className="text-white">Auth</dt>
                    <dd>{runtimeConfig.authBaseUrl}</dd>
                  </div>
                  <div>
                    <dt className="text-white">Artifacts</dt>
                    <dd>{runtimeConfig.artifactBaseUrl}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-[24px] border border-cw-border bg-cw-panel p-5 backdrop-blur">
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-amber">Actor session</p>
                {actorQuery.data ? (
                  <div className="mt-3 space-y-2 text-sm text-cw-muted">
                    <p className="text-white">{actorQuery.data.name ?? actorQuery.data.id}</p>
                    <p>{actorQuery.data.subjectType}</p>
                    {actorQuery.data.email ? <p>{actorQuery.data.email}</p> : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-cw-muted">{t('shell.authPlaceholder')}</p>
                )}
              </section>
            </aside>
          </div>
        </main>

        <footer className="pb-4 text-sm text-cw-muted">{t('shell.footer')}</footer>
      </div>
    </div>
  )
}
