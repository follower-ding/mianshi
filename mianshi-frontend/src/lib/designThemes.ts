import type { MianshiThemeId } from '../pages/design-showcase/mianshi-compare/themes'

export type { MianshiThemeId }

export const THEME_LABELS: Record<MianshiThemeId, string> = {
  professional: '专业',
  literary: '文艺',
  'dark-tech': '暗色科技',
}

export const THEME_STORAGE_KEY = 'mianshi-ui-theme'

export function getStoredTheme(): MianshiThemeId {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY) as MianshiThemeId | null
    if (v === 'professional' || v === 'literary' || v === 'dark-tech') return v
  } catch {
    /* ignore */
  }
  return 'dark-tech'
}

/** CSS custom properties applied to html[data-theme] — synced with index.css */
export const THEME_CSS_VARS: Record<MianshiThemeId, Record<string, string>> = {
  professional: {
    '--ds-page': '#f8fafc',
    '--ds-elevated': '#ffffff',
    '--ds-panel': '#f1f5f9',
    '--ds-brand': '#0d9488',
    '--ds-brand-dark': '#0f766e',
    '--ds-brand-hover': '#14b8a6',
    '--ds-brand-light': 'rgba(13, 148, 136, 0.1)',
    '--ds-text': '#0f172a',
    '--ds-text-secondary': '#475569',
    '--ds-muted': '#64748b',
    '--ds-border': '#e2e8f0',
    '--ds-border-light': '#f1f5f9',
    '--ds-bg-subtle': '#f1f5f9',
    '--ds-on-brand': '#ffffff',
    '--ds-grid': 'none',
    '--ds-font': '"DM Sans", "PingFang SC", system-ui, sans-serif',
  },
  literary: {
    '--ds-page': '#faf8f5',
    '--ds-elevated': '#ffffff',
    '--ds-panel': '#f3f0eb',
    '--ds-brand': '#b8956b',
    '--ds-brand-dark': '#9a7a4f',
    '--ds-brand-hover': '#c9a67a',
    '--ds-brand-light': 'rgba(184, 149, 107, 0.14)',
    '--ds-text': '#2c2825',
    '--ds-text-secondary': '#6b6158',
    '--ds-muted': '#8b7e74',
    '--ds-border': '#e8e2da',
    '--ds-border-light': '#f3f0eb',
    '--ds-bg-subtle': '#f3f0eb',
    '--ds-on-brand': '#ffffff',
    '--ds-grid': 'none',
    '--ds-font': '"Raleway", "PingFang SC", sans-serif',
  },
  'dark-tech': {
    '--ds-page': '#0a0a0f',
    '--ds-elevated': '#12121a',
    '--ds-panel': '#1a1a24',
    '--ds-brand': '#22d3ee',
    '--ds-brand-dark': '#06b6d4',
    '--ds-brand-hover': '#67e8f9',
    '--ds-brand-light': 'rgba(34, 211, 238, 0.12)',
    '--ds-text': '#f1f5f9',
    '--ds-text-secondary': '#94a3b8',
    '--ds-muted': '#64748b',
    '--ds-border': '#27272a',
    '--ds-border-light': '#1f1f28',
    '--ds-bg-subtle': '#1a1a24',
    '--ds-on-brand': '#0a0a0f',
    '--ds-grid':
      'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,211,238,0.06), transparent), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    '--ds-font': 'Inter, "PingFang SC", system-ui, sans-serif',
  },
}

export function applyThemeToDocument(themeId: MianshiThemeId) {
  const root = document.documentElement
  root.setAttribute('data-theme', themeId)
  root.style.colorScheme = themeId === 'dark-tech' ? 'dark' : 'light'
  const vars = THEME_CSS_VARS[themeId]
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}
