import type { ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  accent?: 'cyan' | 'magenta' | 'purple' | 'none'
}

export function GlassPanel({ children, className = '', accent = 'none' }: GlassPanelProps) {
  const accentClass = {
    cyan: 'border-cw-cyan/15 hover:border-cw-cyan/30 hover:shadow-[0_0_16px_rgba(0,229,255,0.08)]',
    magenta: 'border-cw-magenta/15 hover:border-cw-magenta/30 hover:shadow-[0_0_16px_rgba(255,45,107,0.08)]',
    purple: 'border-cw-purple/15 hover:border-cw-purple/30 hover:shadow-[0_0_16px_rgba(179,136,255,0.08)]',
    none: 'border-cw-border hover:border-cw-border-hover',
  }[accent]

  return (
    <div
      className={`
        rounded-xl border transition-all duration-200
        bg-cw-surface backdrop-blur-md
        ${accentClass}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
