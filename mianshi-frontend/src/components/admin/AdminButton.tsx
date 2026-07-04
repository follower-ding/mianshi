import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { adminCx } from './adminTheme'

const sizes = {
  sm: '!px-3 !py-1.5 !text-xs',
  md: '!px-4 !py-2 !text-sm',
} as const

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'

const variants: Record<Variant, string> = {
  primary: adminCx.btnPrimary,
  secondary: adminCx.btnSecondary,
  ghost: adminCx.btnGhost,
  destructive:
    'inline-flex items-center justify-center gap-1.5 rounded-[var(--admin-radius-lg,0.5rem)] bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: keyof typeof sizes
}

export const AdminButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
)
AdminButton.displayName = 'AdminButton'

type LinkButtonProps = Omit<LinkProps, 'className'> & {
  variant?: Variant
  size?: keyof typeof sizes
  className?: string
  children: React.ReactNode
}

export function AdminButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={`${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </Link>
  )
}
