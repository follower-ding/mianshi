import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { textareaClassName } from './inputStyles'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => (
    <textarea ref={ref} className={`${textareaClassName} ${className}`} {...props} />
  ),
)
Textarea.displayName = 'Textarea'
