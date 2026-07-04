import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

type Props = {
  label: string
  hint?: string
  error?: string
  htmlFor?: string
  className?: string
  children: ReactNode
}

export function FormField({ label, hint, error, htmlFor, className = '', children }: Props) {
  const uid = useId()
  const fieldId = htmlFor ?? uid
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  let field = children
  if (isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>
    field = cloneElement(child, {
      id: (child.props.id as string | undefined) ?? fieldId,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? errorId : hint ? hintId : undefined,
    })
  }

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium text-text-secondary">
        {label}
      </label>
      {field}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-[11px] leading-snug text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
