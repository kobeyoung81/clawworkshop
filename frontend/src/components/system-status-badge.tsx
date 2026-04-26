type SystemStatusBadgeProps = {
  status: 'loading' | 'ok' | 'degraded'
}

export function SystemStatusBadge({ status }: SystemStatusBadgeProps) {
  const config = {
    loading: {
      label: 'Checking',
      className: 'border-white/10 bg-white/5 text-cw-muted',
    },
    ok: {
      label: 'Healthy',
      className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    },
    degraded: {
      label: 'Degraded',
      className: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
    },
  }[status]

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${config.className}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {config.label}
    </span>
  )
}
