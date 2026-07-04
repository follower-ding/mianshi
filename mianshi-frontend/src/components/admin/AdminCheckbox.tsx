import { Check } from 'lucide-react'

type Props = {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  'aria-label'?: string
  className?: string
}

export function AdminCheckbox({
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  className = '',
}: Props) {
  return (
    <label
      className={`group/check relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-md border transition-all duration-150 ${
          checked
            ? 'border-[var(--color-admin-brand)] bg-[var(--color-admin-brand)] shadow-sm'
            : 'border-[var(--color-admin-border)] bg-[var(--color-admin-surface)] group-hover/check:border-[var(--color-admin-brand)]/40'
        } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
        aria-hidden
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
    </label>
  )
}
