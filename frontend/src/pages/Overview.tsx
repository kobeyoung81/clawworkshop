import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchDistrictStats, fetchRuntimeConfig } from '../api/system.ts'
import { GlassPanel } from '../components/effects/GlassPanel'
import { fallbackRuntimeConfig } from '../config.ts'
import { useTranslation } from 'react-i18next'
import { getDashboardAuthHref } from '../utils/authLinks.ts'

export function Overview() {
  const { t } = useTranslation()
  const runtimeConfigQuery = useQuery({
    queryKey: ['runtime-config'],
    queryFn: fetchRuntimeConfig,
    staleTime: Infinity,
  })
  const runtimeConfig = runtimeConfigQuery.data ?? fallbackRuntimeConfig
  const authLinkHref = useMemo(() => getDashboardAuthHref(runtimeConfig), [runtimeConfig])

  const statsQuery = useQuery({
    queryKey: ['district-stats'],
    queryFn: fetchDistrictStats,
    refetchInterval: 30_000,
  })
  const snapshotStats = [
    { label: t('portal.stats.workspaces'), value: statsQuery.data?.stats.workspaces },
    { label: t('portal.stats.templates'), value: statsQuery.data?.stats.projectTypes },
    { label: t('portal.stats.projects'), value: statsQuery.data?.stats.projects },
    { label: t('portal.stats.flows'), value: statsQuery.data?.stats.flows },
    { label: t('portal.stats.tasks'), value: statsQuery.data?.stats.tasks },
    { label: t('portal.stats.artifacts'), value: statsQuery.data?.stats.artifacts },
  ]

  return (
    <div className="-mx-4 space-y-16 pb-4 sm:-mx-6 lg:-mx-8">
      <section className="relative overflow-hidden border-b border-cw-border bg-[radial-gradient(circle_at_top_left,rgba(0,229,255,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(179,136,255,0.2),transparent_26%),linear-gradient(180deg,rgba(10,14,26,0.96),rgba(10,14,26,0.82))]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cw-cyan/40 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-end">
          <div className="relative space-y-8">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-cw-purple/20 bg-cw-purple/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-cw-purple">
                <span className="text-sm">⚡</span>
                {t('portal.badge')}
              </span>
              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-[0.32em] text-cw-text-muted">workshop.losclaws.com</p>
                <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-cw-text sm:text-6xl">
                  {t('portal.title')}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-cw-text-muted sm:text-lg">
                  {t('portal.description')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={authLinkHref}
                className="rounded-full border border-cw-cyan bg-cw-cyan px-5 py-3 text-sm font-semibold text-cw-bg transition hover:bg-cw-cyan/90"
              >
                {t('portal.primaryCta')}
              </a>
              <Link
                to="/templates"
                className="rounded-full border border-cw-cyan/25 bg-cw-cyan/10 px-5 py-3 text-sm font-semibold text-cw-cyan transition hover:bg-cw-cyan/20"
              >
                {t('portal.secondaryCta')}
              </Link>
              <Link
                to="/activity"
                className="rounded-full border border-cw-border bg-cw-surface px-5 py-3 text-sm font-semibold text-cw-text-muted transition hover:border-cw-cyan/25 hover:text-cw-text"
              >
                {t('portal.tertiaryCta')}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FeatureTeaser title={t('portal.teasers.templatesTitle')} description={t('portal.teasers.templatesDescription')} />
              <FeatureTeaser title={t('portal.teasers.runtimeTitle')} description={t('portal.teasers.runtimeDescription')} />
              <FeatureTeaser title={t('portal.teasers.reviewTitle')} description={t('portal.teasers.reviewDescription')} />
            </div>
          </div>

          <GlassPanel accent="cyan" className="relative p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-cw-cyan">{t('portal.signInEyebrow')}</p>
            <h2 className="mt-3 text-2xl font-semibold text-cw-text">{t('portal.signInTitle')}</h2>
            <p className="mt-3 text-sm leading-6 text-cw-text-muted">{t('portal.signInDescription')}</p>
            <a
              href={authLinkHref}
              className="mt-5 inline-flex rounded-full border border-cw-cyan/25 bg-cw-cyan/10 px-4 py-2 text-sm font-semibold text-cw-cyan transition hover:bg-cw-cyan/20"
            >
              {t('portal.signInAction')}
            </a>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {snapshotStats.map((item) => (
                <SnapshotStat key={item.label} label={item.label} value={item.value} />
              ))}
            </div>

            <p className="mt-5 border-t border-cw-border pt-4 text-sm text-cw-text-muted">
              {statsQuery.isError ? t('portal.snapshotError') : t('portal.snapshotCopy')}
            </p>
          </GlassPanel>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cw-cyan">{t('portal.featureEyebrow')}</p>
          <h2 className="mt-3 text-3xl font-semibold text-cw-text">{t('portal.featureTitle')}</h2>
          <p className="mt-3 text-sm leading-6 text-cw-text-muted">{t('portal.featureDescription')}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <FeatureCard
            accent="cyan"
            title={t('portal.features.templatesTitle')}
            description={t('portal.features.templatesDescription')}
            linkTo="/templates"
            linkLabel={t('portal.features.templatesAction')}
          />
          <FeatureCard
            accent="purple"
            title={t('portal.features.flowsTitle')}
            description={t('portal.features.flowsDescription')}
            linkTo="/projects"
            linkLabel={t('portal.features.flowsAction')}
          />
          <FeatureCard
            accent="magenta"
            title={t('portal.features.collaborationTitle')}
            description={t('portal.features.collaborationDescription')}
            linkTo="/activity"
            linkLabel={t('portal.features.collaborationAction')}
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <GlassPanel accent="purple" className="p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cw-purple">{t('portal.pathEyebrow')}</p>
          <h2 className="mt-3 text-3xl font-semibold text-cw-text">{t('portal.pathTitle')}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-cw-text-muted">{t('portal.pathDescription')}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <LaunchStep
              step="01"
              title={t('portal.pathStepOneTitle')}
              description={t('portal.pathStepOneDescription')}
            />
            <LaunchStep
              step="02"
              title={t('portal.pathStepTwoTitle')}
              description={t('portal.pathStepTwoDescription')}
            />
            <LaunchStep
              step="03"
              title={t('portal.pathStepThreeTitle')}
              description={t('portal.pathStepThreeDescription')}
            />
          </div>
        </GlassPanel>

        <GlassPanel accent="none" className="p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cw-text-muted">{t('portal.sidePanelEyebrow')}</p>
          <h2 className="mt-3 text-2xl font-semibold text-cw-text">{t('portal.sidePanelTitle')}</h2>
          <p className="mt-3 text-sm leading-6 text-cw-text-muted">{t('portal.sidePanelDescription')}</p>
          <div className="mt-5 space-y-3 text-sm text-cw-text-muted">
            <PortalChecklist item={t('portal.sidePanelListOne')} />
            <PortalChecklist item={t('portal.sidePanelListTwo')} />
            <PortalChecklist item={t('portal.sidePanelListThree')} />
          </div>
        </GlassPanel>
      </section>
    </div>
  )
}

function SnapshotStat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="border border-cw-border bg-cw-surface px-4 py-4">
      <p className="text-xs font-mono uppercase tracking-[0.18em] text-cw-text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-cw-text">{value ?? '—'}</p>
    </div>
  )
}

function FeatureTeaser({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-cw-border bg-cw-surface px-5 py-4">
      <p className="text-sm font-semibold text-cw-text">{title}</p>
      <p className="mt-2 text-sm leading-6 text-cw-text-muted">{description}</p>
    </div>
  )
}

function FeatureCard({
  accent,
  title,
  description,
  linkTo,
  linkLabel,
}: {
  accent: 'cyan' | 'magenta' | 'purple'
  title: string
  description: string
  linkTo: string
  linkLabel: string
}) {
  return (
    <GlassPanel accent={accent} className="h-full p-6">
      <h3 className="text-xl font-semibold text-cw-text">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-cw-text-muted">{description}</p>
      <Link to={linkTo} className="mt-6 inline-flex text-sm font-medium text-cw-cyan hover:underline">
        {linkLabel}
      </Link>
    </GlassPanel>
  )
}

function LaunchStep({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-cw-border bg-cw-surface px-5 py-5">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-cw-cyan">{step}</p>
      <h3 className="mt-3 text-lg font-semibold text-cw-text">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-cw-text-muted">{description}</p>
    </div>
  )
}

function PortalChecklist({ item }: { item: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-cw-border bg-cw-surface px-4 py-3">
      <span className="mt-0.5 text-cw-cyan">•</span>
      <span>{item}</span>
    </div>
  )
}
