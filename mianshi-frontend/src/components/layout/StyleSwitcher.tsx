import { Palette } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { THEME_LABELS } from '../../lib/designThemes'
import { THEME_ORDER } from '../../pages/design-showcase/mianshi-compare/themes'

type Props = {
  compact?: boolean
  variant?: 'bar' | 'menu'
}

export function StyleSwitcher({ compact = false, variant = 'bar' }: Props) {
  const { themeId, setThemeId } = useTheme()

  if (variant === 'menu') {
    return (
      <div className="space-y-1" role="group" aria-label="界面风格">
        {THEME_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setThemeId(id)}
            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              themeId === id
                ? 'bg-brand/10 font-medium text-brand'
                : 'text-text-secondary hover:bg-bg-subtle hover:text-text'
            }`}
          >
            <span>{THEME_LABELS[id]}</span>
            {themeId === id && (
              <span className="text-[10px] uppercase tracking-wide text-brand/80">当前</span>
            )}
          </button>
        ))}
      </div>
    )
  }

  if (compact) {
    return (
      <div
        className="flex items-center gap-0.5 rounded-lg border border-border bg-bg-subtle p-0.5"
        role="group"
        aria-label="界面风格"
      >
        {THEME_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setThemeId(id)}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              themeId === id
                ? 'bg-elevated text-brand shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
            title={THEME_LABELS[id]}
          >
            {THEME_LABELS[id]}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-elevated p-1.5">
      <Palette className="ml-1 h-4 w-4 text-muted" aria-hidden />
      {THEME_ORDER.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setThemeId(id)}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            themeId === id
              ? 'bg-brand-light text-brand ring-1 ring-brand/30'
              : 'text-text-secondary hover:bg-bg-subtle hover:text-text'
          }`}
        >
          {THEME_LABELS[id]}
        </button>
      ))}
    </div>
  )
}
