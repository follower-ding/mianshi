import { useId, isValidElement, cloneElement, type ReactNode } from 'react'
import { resumeUi } from './resumeLayout'

type Props = {
  label: string
  hint?: string
  className?: string
  fieldId?: string
  children: ReactNode
}

/** 带可见标签的表单字段 — label 与控件通过 id/htmlFor 关联 */
export function ResumeFormField({ label, hint, className = '', fieldId: propId, children }: Props) {
  const autoId = useId()
  const fieldId = propId ?? autoId

  const control =
    isValidElement(children)
      ? cloneElement(children as React.ReactElement<{ id?: string }>, {
          id: (children as React.ReactElement<{ id?: string }>).props.id ?? fieldId,
        })
      : children

  return (
    <div className={className}>
      <label className={resumeUi.fieldLabel} htmlFor={fieldId}>
        {label}
      </label>
      {control}
      {hint && <p className={resumeUi.fieldHint}>{hint}</p>}
    </div>
  )
}
