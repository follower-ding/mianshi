import type { ReactNode } from 'react'
import { adminCx } from './adminTheme'

type Props = {
  children: ReactNode
  className?: string
  title?: ReactNode
  extra?: ReactNode
  compact?: boolean
}

export function AdminCard({ children, className = '', title, extra, compact }: Props) {
  return (
    <div className={`${adminCx.surface} ${compact ? 'p-3' : 'p-4'} ${className}`}>
      {(title || extra) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <div className="text-sm font-semibold text-admin-text">{title}</div>}
          {extra}
        </div>
      )}
      {children}
    </div>
  )
}

type TableProps = {
  children: ReactNode
  footer?: ReactNode
  minWidth?: string
  /** elevated：圆角 xl + 阴影 + 宽松行高 */
  variant?: 'compact' | 'elevated'
}

export function AdminTable({ children, footer, minWidth, variant = 'compact' }: TableProps) {
  const elevated = variant === 'elevated'

  return (
    <div
      className={
        elevated
          ? `${adminCx.surfaceElevated} overflow-hidden`
          : `${adminCx.surface} overflow-hidden`
      }
    >
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-sm"
          style={minWidth ? { minWidth } : undefined}
        >
          {children}
        </table>
      </div>
      {footer && (
        <div className="border-t border-admin-border/80 bg-admin-surface-alt/50 px-4 py-2.5 text-xs text-admin-muted">
          {footer}
        </div>
      )}
    </div>
  )
}

export function AdminTableHead({
  children,
  variant = 'compact',
}: {
  children: ReactNode
  variant?: 'compact' | 'elevated'
}) {
  const elevated = variant === 'elevated'
  return (
    <thead>
      <tr
        className={
          elevated
            ? 'border-b border-admin-border/80'
            : `border-b border-admin-border ${adminCx.surfaceAlt}`
        }
      >
        {children}
      </tr>
    </thead>
  )
}

export function AdminTh({
  children,
  className = '',
  variant = 'compact',
}: {
  children?: ReactNode
  className?: string
  variant?: 'compact' | 'elevated'
}) {
  const thClass = variant === 'elevated' ? adminCx.thElevated : adminCx.th
  return <th className={`${thClass} ${className}`}>{children}</th>
}

export function AdminTd({
  children,
  className = '',
  colSpan,
  dense,
}: {
  children?: ReactNode
  className?: string
  colSpan?: number
  dense?: boolean
}) {
  return (
    <td className={`${dense ? adminCx.tdDense : adminCx.td} ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}

export function AdminTr({
  children,
  selected,
  className = '',
  variant = 'compact',
}: {
  children: ReactNode
  selected?: boolean
  className?: string
  variant?: 'compact' | 'elevated'
}) {
  const hoverClass =
    variant === 'elevated' ? adminCx.trHoverElevated : adminCx.trHover

  return (
    <tr
      className={`group ${hoverClass} ${
        selected
          ? 'bg-[var(--color-admin-brand-light)]/50 ring-1 ring-inset ring-[var(--color-admin-brand)]/20'
          : ''
      } ${className}`}
    >
      {children}
    </tr>
  )
}
