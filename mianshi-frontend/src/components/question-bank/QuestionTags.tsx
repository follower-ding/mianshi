import { categoryTagClass, difficultyTagClass } from './bankTheme'

export function DifficultyTag({ difficulty }: { difficulty: string }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-normal ${difficultyTagClass(difficulty)}`}>
      {difficulty}
    </span>
  )
}

export function CategoryTag({ children }: { children: string }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-normal ${categoryTagClass()}`}>
      {children}
    </span>
  )
}

export function TypeTag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-elevated px-2 py-0.5 text-xs font-normal text-text-secondary">
      {children}
    </span>
  )
}
