import type { CSSProperties, ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  style?: CSSProperties
}

export function Card({ children, className = '', hover = false, onClick, style }: CardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={style}
      className={`rounded-2xl border border-border bg-elevated shadow-card transition-all duration-200 ${
        hover ? 'hover:border-brand/30 hover:shadow-card-hover' : ''
      } ${onClick ? 'cursor-pointer text-left w-full' : ''} ${className}`}
    >
      {children}
    </Tag>
  )
}
