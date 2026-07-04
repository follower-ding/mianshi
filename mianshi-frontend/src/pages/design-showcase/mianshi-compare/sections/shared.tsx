import type { MianshiTheme } from '../themes'

type Props = {
  theme: MianshiTheme
  children: React.ReactNode
  className?: string
}

export function ThemeShell({ theme, children, className = '' }: Props) {
  const c = theme.colors
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        fontFamily: theme.fontBody,
        background: c.bg,
        color: c.text,
        borderRadius: theme.radius,
        boxShadow: theme.shadow,
        border: `1px solid ${c.border}`,
      }}
    >
      {children}
    </div>
  )
}

export function Eyebrow({ theme, children }: { theme: MianshiTheme; children: React.ReactNode }) {
  return (
    <span
      className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em]"
      style={{ color: theme.colors.muted, fontFamily: theme.fontBody }}
    >
      {children}
    </span>
  )
}

export function PrimaryBtn({
  theme,
  children,
  secondary,
}: {
  theme: MianshiTheme
  children: React.ReactNode
  secondary?: boolean
}) {
  const c = theme.colors
  return (
    <button
      type="button"
      className="cursor-pointer px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:translate-y-px"
      style={
        secondary
          ? {
              background: 'transparent',
              color: c.text,
              border: `1px solid ${c.border}`,
              borderRadius: theme.radius,
            }
          : {
              background: c.accent,
              color: theme.id === 'dark-tech' ? '#0A0A0F' : '#FFFFFF',
              borderRadius: theme.radius,
            }
      }
    >
      {children}
    </button>
  )
}
