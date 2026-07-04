import { forwardRef, type InputHTMLAttributes } from 'react'
import { inputClassName } from './inputStyles'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input ref={ref} className={`${inputClassName} ${className}`} {...props} />
  ),
)
Input.displayName = 'Input'
