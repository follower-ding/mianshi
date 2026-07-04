import type { CSSProperties } from 'react'

/** Admin 风格 variant — 对比页与全局切换真源 */

export type AdminVariantId =
  | 'shadcn-admin'
  | 'studio-neutral'
  | 'slate-console'
  | 'data-dense'

export const ADMIN_VARIANT_ORDER: AdminVariantId[] = [
  'shadcn-admin',
  'studio-neutral',
  'slate-console',
  'data-dense',
]

export type AdminVariantMeta = {
  id: AdminVariantId
  label: string
  tagline: string
  description: string
  reference: string
  tokens: Record<string, string>
  layout: {
    sidebarWidth: string
    pagePadding: string
    sectionGap: string
    cardRadius: string
    tableRowPy: string
    fontFamily?: string
    fontMono?: string
  }
}

export const ADMIN_VARIANTS: Record<AdminVariantId, AdminVariantMeta> = {
  'shadcn-admin': {
    id: 'shadcn-admin',
    label: 'Shadcn Admin',
    tagline: '全暗色仪表盘',
    description: '参考 shadcn-admin · zinc 色阶 · 顶栏搜索 · 卡片 KPI',
    reference: 'shadcn-admin.netlify.app',
    tokens: {
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
      '--color-admin-sidebar-indicator': '#fafafa',
      '--admin-sidebar-width': '240px',
      '--color-admin-header-bg': '#09090b',
      '--color-admin-thead': '#18181b',
      '--color-admin-row-hover': '#18181b',
      '--shadow-admin-card': 'none',
      '--shadow-admin-card-hover': 'none',
      '--shadow-admin-row-hover': 'none',
      '--admin-radius-lg': '0.5rem',
      '--admin-radius-xl': '0.75rem',
    },
    layout: {
      sidebarWidth: '240px',
      pagePadding: '24px',
      sectionGap: '16px',
      cardRadius: '8px',
      tableRowPy: '14px',
    },
  },
  'studio-neutral': {
    id: 'studio-neutral',
    label: 'Studio Neutral',
    tagline: 'Linear × shadcn',
    description: '浅灰底 · 白侧栏 · teal 主色 · 细 border · 零渐变',
    reference: 'Linear / shadcn neutral',
    tokens: {
      '--color-admin-page': '#fafafa',
      '--color-admin-surface': '#ffffff',
      '--color-admin-surface-alt': '#f5f5f5',
      '--color-admin-border': '#e5e5e5',
      '--color-admin-border-light': '#f0f0f0',
      '--color-admin-text': '#171717',
      '--color-admin-text-secondary': '#525252',
      '--color-admin-muted': '#a3a3a3',
      '--color-admin-brand': '#0f766e',
      '--color-admin-brand-hover': '#0d9488',
      '--color-admin-brand-light': 'rgba(15, 118, 110, 0.08)',
      '--color-admin-brand-soft': 'rgba(15, 118, 110, 0.04)',
      '--color-admin-on-brand': '#ffffff',
      '--color-admin-sidebar-bg': '#fafafa',
      '--color-admin-sidebar-border': '#e5e5e5',
      '--color-admin-sidebar-text': '#737373',
      '--color-admin-sidebar-text-active': '#171717',
      '--color-admin-sidebar-hover': '#f0f0f0',
      '--color-admin-sidebar-indicator': '#0f766e',
      '--color-admin-sidebar-glow': 'rgba(15, 118, 110, 0.08)',
      '--color-admin-header-bg': '#ffffff',
      '--color-admin-thead': '#fafafa',
      '--color-admin-row-hover': '#f5f5f5',
      '--shadow-admin-card': '0 1px 2px rgba(0,0,0,0.04)',
      '--shadow-admin-card-hover': '0 4px 16px rgba(0,0,0,0.06)',
      '--shadow-admin-row-hover': 'none',
      '--admin-radius-lg': '0.75rem',
      '--admin-radius-xl': '1rem',
    },
    layout: {
      sidebarWidth: '220px',
      pagePadding: '24px',
      sectionGap: '20px',
      cardRadius: '12px',
      tableRowPy: '16px',
    },
  },
  'slate-console': {
    id: 'slate-console',
    label: 'Slate Console',
    tagline: 'dark-tech 桥接',
    description: '深色 slate 侧栏 · cyan 点睛 · 内容区 Elevated 白卡片',
    reference: 'Supabase / Vercel dark sidebar',
    tokens: {
      '--color-admin-page': '#f1f5f9',
      '--color-admin-surface': '#ffffff',
      '--color-admin-surface-alt': '#f8fafc',
      '--color-admin-border': '#e2e8f0',
      '--color-admin-border-light': '#f1f5f9',
      '--color-admin-text': '#0f172a',
      '--color-admin-text-secondary': '#475569',
      '--color-admin-muted': '#94a3b8',
      '--color-admin-brand': '#0891b2',
      '--color-admin-brand-hover': '#0e7490',
      '--color-admin-brand-light': 'rgba(8, 145, 178, 0.1)',
      '--color-admin-brand-soft': 'rgba(34, 211, 238, 0.06)',
      '--color-admin-on-brand': '#ffffff',
      '--color-admin-sidebar-bg': '#0f172a',
      '--color-admin-sidebar-border': 'rgba(148, 163, 184, 0.12)',
      '--color-admin-sidebar-text': '#94a3b8',
      '--color-admin-sidebar-text-active': '#f8fafc',
      '--color-admin-sidebar-hover': 'rgba(255, 255, 255, 0.06)',
      '--color-admin-sidebar-indicator': '#22d3ee',
      '--color-admin-sidebar-glow': 'rgba(34, 211, 238, 0.12)',
      '--color-admin-header-bg': '#ffffff',
      '--color-admin-thead': '#f8fafc',
      '--color-admin-row-hover': '#f1f5f9',
      '--shadow-admin-card': '0 1px 3px rgba(15,23,42,0.06)',
      '--shadow-admin-card-hover': '0 8px 24px rgba(15,23,42,0.08)',
      '--shadow-admin-row-hover': '0 1px 2px rgba(15,23,42,0.04)',
      '--admin-radius-lg': '0.75rem',
      '--admin-radius-xl': '1rem',
    },
    layout: {
      sidebarWidth: '220px',
      pagePadding: '24px',
      sectionGap: '20px',
      cardRadius: '12px',
      tableRowPy: '16px',
    },
  },
  'data-dense': {
    id: 'data-dense',
    label: 'Data Dense Pro',
    tagline: '高密度操作',
    description: '更紧间距 · 蓝灰数据色 · Fira 字体 · 审核/监控友好',
    reference: 'Retool / BI dashboard',
    tokens: {
      '--color-admin-page': '#f5f5f5',
      '--color-admin-surface': '#ffffff',
      '--color-admin-surface-alt': '#fafafa',
      '--color-admin-border': '#d4d4d4',
      '--color-admin-border-light': '#e5e5e5',
      '--color-admin-text': '#333333',
      '--color-admin-text-secondary': '#525252',
      '--color-admin-muted': '#737373',
      '--color-admin-brand': '#1e40af',
      '--color-admin-brand-hover': '#1d4ed8',
      '--color-admin-brand-light': 'rgba(30, 64, 175, 0.08)',
      '--color-admin-brand-soft': 'rgba(30, 64, 175, 0.04)',
      '--color-admin-on-brand': '#ffffff',
      '--color-admin-sidebar-bg': '#ffffff',
      '--color-admin-sidebar-border': '#e5e5e5',
      '--color-admin-sidebar-text': '#737373',
      '--color-admin-sidebar-text-active': '#171717',
      '--color-admin-sidebar-hover': '#f5f5f5',
      '--color-admin-sidebar-indicator': '#1e40af',
      '--color-admin-header-bg': '#ffffff',
      '--color-admin-thead': '#f5f5f5',
      '--color-admin-row-hover': '#fafafa',
      '--shadow-admin-card': '0 1px 2px rgba(0,0,0,0.05)',
      '--shadow-admin-card-hover': '0 2px 8px rgba(0,0,0,0.06)',
      '--shadow-admin-row-hover': 'none',
      '--admin-radius-lg': '0.5rem',
      '--admin-radius-xl': '0.625rem',
    },
    layout: {
      sidebarWidth: '200px',
      pagePadding: '16px',
      sectionGap: '12px',
      cardRadius: '8px',
      tableRowPy: '12px',
      fontFamily: '"Fira Sans", system-ui, sans-serif',
      fontMono: '"Fira Code", monospace',
    },
  },
}

export const ADMIN_VARIANT_STORAGE_KEY = 'mianshi-admin-variant'

export function getStoredAdminVariant(): AdminVariantId {
  if (typeof window === 'undefined') return 'shadcn-admin'
  const v = localStorage.getItem(ADMIN_VARIANT_STORAGE_KEY)
  if (v && v in ADMIN_VARIANTS) return v as AdminVariantId
  return 'shadcn-admin'
}

/** 后台默认设计体系 — Shadcn Admin */
export function getAdminDesignVariant(): AdminVariantId {
  return 'shadcn-admin'
}

export function storeAdminVariant(id: AdminVariantId) {
  localStorage.setItem(ADMIN_VARIANT_STORAGE_KEY, id)
  window.dispatchEvent(new CustomEvent('admin-variant-change', { detail: id }))
}

export function adminVariantStyle(id: AdminVariantId): CSSProperties {
  const v = ADMIN_VARIANTS[id]
  return {
    ...v.tokens,
    ...(v.layout.fontFamily ? { fontFamily: v.layout.fontFamily } : {}),
  } as CSSProperties
}

export function isDarkSidebar(id: AdminVariantId) {
  return id === 'slate-console' || id === 'shadcn-admin'
}

export function isShadcnAdmin(id: AdminVariantId) {
  return id === 'shadcn-admin'
}

export function isFullDarkAdmin(id: AdminVariantId) {
  return id === 'shadcn-admin'
}
