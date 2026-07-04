import { SECTION_LABELS, type ResumeSectionKey } from './resumeSections'
import { resumeUi } from './resumeLayout'

type Props = {
  sectionOrder: ResumeSectionKey[]
  visibility: Record<ResumeSectionKey, boolean>
  onToggle: (key: ResumeSectionKey) => void
  activeSection: ResumeSectionKey | null
  onSelect: (key: ResumeSectionKey) => void
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${on ? '隐藏' : '显示'}${label}模块`}
      onClick={onClick}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
        on ? 'bg-brand' : 'bg-border'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-4' : ''
        }`}
      />
    </button>
  )
}

export function ResumeSectionSidebar({
  sectionOrder,
  visibility,
  onToggle,
  activeSection,
  onSelect,
}: Props) {
  const items = [
    { key: 'basic' as ResumeSectionKey, label: SECTION_LABELS.basic },
    ...sectionOrder.map((key) => ({ key, label: SECTION_LABELS[key] })),
  ]

  return (
    <div className={resumeUi.sideNavSection}>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.key}>
            <div
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors ${
                activeSection === item.key ? 'bg-brand/10' : 'hover:bg-bg-subtle/60'
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm text-text-secondary hover:text-text"
                onClick={() => onSelect(item.key)}
              >
                {item.label}
              </button>
              <Toggle
                on={visibility[item.key]}
                label={item.label}
                onClick={() => onToggle(item.key)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
