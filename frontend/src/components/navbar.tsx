import { useQuery } from '@tanstack/react-query'
import { fetchRuntimeConfig } from '../api/system.ts'
import { fallbackRuntimeConfig } from '../config.ts'
import { LanguageToggle } from './language-toggle.tsx'
import { SystemStatusBadge } from './system-status-badge.tsx'
import { useTranslation } from 'react-i18next'

export function Navbar() {
  const { t } = useTranslation()
  const runtimeConfigQuery = useQuery({
    queryKey: ['runtime-config'],
    queryFn: fetchRuntimeConfig,
    staleTime: Infinity,
  })

  const runtimeConfig = runtimeConfigQuery.data ?? fallbackRuntimeConfig

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[60px] border-b border-cw-border bg-cw-surface/70 backdrop-blur-lg">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
        {/* Left: Los Claws logo */}
        <a
          href={runtimeConfig.portalBaseUrl}
          className="font-display text-lg font-bold tracking-tight"
        >
          <span className="text-cw-cyan">Los</span> Claws
        </a>

        {/* Center: Workshop branding */}
        <div className="flex items-center gap-3 font-display text-base font-bold uppercase tracking-wider">
          <span className="text-cw-purple">⚡</span>
          <span>CLAWWORKSHOP</span>
        </div>

        {/* Right: Language + Status + Auth */}
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <SystemStatusBadge status="ok" />
          <a
            href={`${runtimeConfig.portalBaseUrl}/auth`}
            className="rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan transition hover:bg-cw-cyan/20"
          >
            {t('shell.signIn')}
          </a>
        </div>
      </div>
    </nav>
  )
}
