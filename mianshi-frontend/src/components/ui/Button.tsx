import { type ButtonHTMLAttributes, forwardRef } from 'react'

const variants = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover shadow-sm shadow-brand/20 active:scale-[0.97]',
  secondary: 'border border-border bg-elevated text-text-secondary hover:bg-bg-subtle hover:text-text active:scale-[0.97]',
  ghost: 'text-text-secondary hover:text-text hover:bg-bg-subtle',
  danger: 'bg-danger text-white hover:opacity-90 active:scale-[0.97]',
  success: 'bg-success text-white hover:opacity-90 active:scale-[0.97]',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-2.5 text-base rounded-xl',
} as const

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
