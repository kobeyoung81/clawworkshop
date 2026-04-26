import { useTranslation } from 'react-i18next'

export function LanguageToggle() {
  const { i18n } = useTranslation()

  return (
    <div className="inline-flex rounded-full border border-cw-border bg-white/5 p-1 text-sm">
      {(['en', 'zh-CN'] as const).map((language) => {
        const active = i18n.language === language

        return (
          <button
            key={language}
            type="button"
            className={`rounded-full px-3 py-1.5 transition ${
              active ? 'bg-cw-cyan/15 text-cw-cyan' : 'text-cw-muted hover:text-cw-text'
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
