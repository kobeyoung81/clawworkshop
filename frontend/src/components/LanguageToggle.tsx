import { useTranslation } from 'react-i18next'

export function LanguageToggle() {
  const { i18n } = useTranslation()

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-cw-border bg-cw-surface px-1 py-1 text-xs font-mono">
      {(['en', 'zh-CN'] as const).map((language) => {
        const active = i18n.language === language

        return (
          <button
            key={language}
            type="button"
            className={`rounded-sm px-2 py-1 transition-colors ${
              active ? 'bg-cw-cyan/10 text-cw-cyan' : 'text-cw-text-muted hover:text-cw-text'
            }`}
            onClick={() => void i18n.changeLanguage(language)}
          >
            {language === 'en' ? 'EN' : '中文'}
          </button>
        )
      })}
    </div>
  )
}
