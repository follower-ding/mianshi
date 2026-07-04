export type MianshiThemeId = 'professional' | 'literary' | 'dark-tech'

export type MianshiTheme = {
  id: MianshiThemeId
  label: string
  tagline: string
  fontDisplay: string
  fontBody: string
  fontMono: string
  googleFonts: string
  colors: {
    bg: string
    surface: string
    surfaceElevated: string
    text: string
    muted: string
    primary: string
    accent: string
    border: string
    accentSoft: string
    heroGlow: string
  }
  radius: string
  shadow: string
}

export const MIANSHI_THEMES: Record<MianshiThemeId, MianshiTheme> = {
  professional: {
    id: 'professional',
    label: '专业',
    tagline: '可信 · 克制 · Bento 效率感',
    fontDisplay: '"DM Sans", system-ui, sans-serif',
    fontBody: '"DM Sans", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    googleFonts:
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap',
    colors: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      text: '#0F172A',
      muted: '#475569',
      primary: '#1E3A5F',
      accent: '#0D9488',
      border: '#E2E8F0',
      accentSoft: 'rgba(13, 148, 136, 0.08)',
      heroGlow: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(30,58,95,0.06), transparent)',
    },
    radius: '12px',
    shadow: '0 4px 6px -1px rgba(15,23,42,0.06), 0 2px 4px -2px rgba(15,23,42,0.04)',
  },
  literary: {
    id: 'literary',
    label: '文艺',
    tagline: '编辑感 · 暖纸色 · 成长叙事',
    fontDisplay: '"Lora", "Noto Serif SC", Georgia, serif',
    fontBody: '"Raleway", "PingFang SC", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    googleFonts:
      'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Raleway:wght@400;500;600;700&display=swap',
    colors: {
      bg: '#FAF8F5',
      surface: '#FFFFFF',
      surfaceElevated: '#F3F0EB',
      text: '#2C2825',
      muted: '#6B6158',
      primary: '#5C534A',
      accent: '#B8956B',
      border: '#E8E2DA',
      accentSoft: 'rgba(184, 149, 107, 0.12)',
      heroGlow: 'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(184,149,107,0.08), transparent)',
    },
    radius: '4px',
    shadow: '0 8px 32px rgba(44,40,37,0.06)',
  },
  'dark-tech': {
    id: 'dark-tech',
    label: '暗色科技',
    tagline: '夜间专注 · cyan 点睛 · 技术密度',
    fontDisplay: 'Inter, system-ui, sans-serif',
    fontBody: 'Inter, system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    googleFonts:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    colors: {
      bg: '#0A0A0F',
      surface: '#12121A',
      surfaceElevated: '#1A1A24',
      text: '#F1F5F9',
      muted: '#94A3B8',
      primary: '#E2E8F0',
      accent: '#22D3EE',
      border: '#27272A',
      accentSoft: 'rgba(34, 211, 238, 0.1)',
      heroGlow:
        'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,211,238,0.08), transparent), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    },
    radius: '16px',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
}

export const THEME_ORDER: MianshiThemeId[] = ['professional', 'literary', 'dark-tech']
