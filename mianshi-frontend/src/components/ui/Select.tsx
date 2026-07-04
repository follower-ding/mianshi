import { forwardRef, type SelectHTMLAttributes } from 'react'
import { selectClassName } from './inputStyles'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...props }, ref) => (
    <select ref={ref} className={`${selectClassName} ${className}`} {...props}>
      {children}
    </select>
  ),
)
Select.displayName = 'Select'
