import { useTranslation } from 'react-i18next'

type SystemStatusBadgeProps = {
  status: 'loading' | 'ok' | 'degraded'
  compact?: boolean
}

export function SystemStatusBadge({ status, compact = false }: SystemStatusBadgeProps) {
  const { t } = useTranslation()
  const config = {
    loading: {
      label: t('nav.systemLoading'),
      className: 'border-cw-border bg-cw-surface text-cw-text-muted',
    },
    ok: {
      label: t('nav.systemOnline'),
      className: 'border-cw-cyan/20 bg-cw-cyan/5 text-cw-cyan',
    },
    degraded: {
      label: t('nav.systemDegraded'),
      className: 'border-cw-amber/25 bg-cw-amber/10 text-cw-amber',
    },
  }[status]

  return (
    <span
      aria-label={config.label}
      className={`inline-flex items-center rounded-full border text-[11px] font-mono uppercase tracking-[0.18em] ${config.className} ${
        compact ? 'h-8 w-8 justify-center px-0 py-0' : 'gap-2 px-3 py-1'
      }`}
    >
      <span className={`h-2 w-2 rounded-full bg-current ${status === 'ok' ? 'animate-pulse' : ''}`} />
      {compact ? null : config.label}
    </span>
  )
}
