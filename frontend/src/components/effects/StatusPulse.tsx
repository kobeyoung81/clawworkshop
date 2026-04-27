import { useTranslation } from 'react-i18next'

interface StatusPulseProps {
  status: 'live' | 'idle' | 'error' | 'waiting'
  label?: string
  className?: string
}

const STATUS_CONFIG = {
  live: { dot: 'bg-cw-success', glow: 'rgba(0, 230, 118, 0.5)' },
  idle: { dot: 'bg-cw-idle', glow: 'rgba(122, 139, 168, 0.3)' },
  error: { dot: 'bg-cw-error', glow: 'rgba(255, 45, 107, 0.5)' },
  waiting: { dot: 'bg-cw-warning', glow: 'rgba(255, 193, 7, 0.5)' },
}

export function StatusPulse({ status, label, className = '' }: StatusPulseProps) {
  const { t } = useTranslation()
  const cfg = STATUS_CONFIG[status]
  const displayLabel = label ?? t(`status.${status}`)

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`}
          style={{ animation: status !== 'idle' ? 'ping 2s cubic-bezier(0,0,0.2,1) infinite' : 'none' }}
        />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
      </span>
      <span className="font-mono text-xs font-semibold uppercase tracking-widest" style={{ color: cfg.glow }}>
        {displayLabel}
      </span>
    </div>
  )
}
