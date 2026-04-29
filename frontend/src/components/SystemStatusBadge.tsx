import { useTranslation } from 'react-i18next'

type SystemStatusBadgeProps = {
  status: 'loading' | 'ok' | 'degraded'
}

export function SystemStatusBadge({ status }: SystemStatusBadgeProps) {
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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] ${config.className}`}
    >
      <span className={`h-2 w-2 rounded-full bg-current ${status === 'ok' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  )
}
