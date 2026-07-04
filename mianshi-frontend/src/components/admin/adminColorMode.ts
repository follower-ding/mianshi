/** Admin 明暗色 — Shadcn Admin light/dark zinc */

export type AdminColorMode = 'dark' | 'light'

export const ADMIN_COLOR_MODE_KEY = 'mianshi-admin-color-mode'

export const ADMIN_DARK_TOKENS: Record<string, string> = {
  '--color-admin-page': '#09090b',
  '--color-admin-surface': '#09090b',
  '--color-admin-surface-alt': '#18181b',
  '--color-admin-border': '#27272a',
  '--color-admin-border-light': '#27272a',
  '--color-admin-text': '#fafafa',
  '--color-admin-text-secondary': '#a1a1aa',
  '--color-admin-muted': '#71717a',
  '--color-admin-brand': '#fafafa',
  '--color-admin-brand-hover': '#e4e4e7',
  '--color-admin-brand-light': 'rgba(255, 255, 255, 0.08)',
  '--color-admin-brand-soft': 'rgba(255, 255, 255, 0.04)',
  '--color-admin-on-brand': '#18181b',
  '--color-admin-sidebar-bg': '#09090b',
  '--color-admin-sidebar-border': '#27272a',
  '--color-admin-sidebar-text': '#a1a1aa',
  '--color-admin-sidebar-text-active': '#fafafa',
  '--color-admin-sidebar-hover': '#27272a',
  '--color-admin-header-bg': '#09090b',
  '--color-admin-thead': '#18181b',
  '--color-admin-row-hover': '#18181b',
}

export const ADMIN_LIGHT_TOKENS: Record<string, string> = {
  '--color-admin-page': '#ffffff',
  '--color-admin-surface': '#ffffff',
  '--color-admin-surface-alt': '#f4f4f5',
  '--color-admin-border': '#e4e4e7',
  '--color-admin-border-light': '#f4f4f5',
  '--color-admin-text': '#09090b',
  '--color-admin-text-secondary': '#52525b',
  '--color-admin-muted': '#71717a',
  '--color-admin-brand': '#18181b',
  '--color-admin-brand-hover': '#27272a',
  '--color-admin-brand-light': 'rgba(9, 9, 11, 0.06)',
  '--color-admin-brand-soft': 'rgba(9, 9, 11, 0.03)',
  '--color-admin-on-brand': '#fafafa',
  '--color-admin-sidebar-bg': '#fafafa',
  '--color-admin-sidebar-border': '#e4e4e7',
  '--color-admin-sidebar-text': '#71717a',
  '--color-admin-sidebar-text-active': '#09090b',
  '--color-admin-sidebar-hover': '#f4f4f5',
  '--color-admin-header-bg': '#ffffff',
  '--color-admin-thead': '#f4f4f5',
  '--color-admin-row-hover': '#fafafa',
}

export function readAdminColorMode(): AdminColorMode {
  try {
    const v = localStorage.getItem(ADMIN_COLOR_MODE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function adminColorModeTokens(mode: AdminColorMode): Record<string, string> {
  return mode === 'light' ? ADMIN_LIGHT_TOKENS : ADMIN_DARK_TOKENS
}

export function storeAdminColorMode(mode: AdminColorMode) {
  try {
    localStorage.setItem(ADMIN_COLOR_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}
