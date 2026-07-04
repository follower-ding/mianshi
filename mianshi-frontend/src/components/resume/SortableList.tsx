import { useCallback, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { reorderList } from './resumeSortable'

type Props<T> = {
  items: T[]
  onReorder: (items: T[], meta: { from: number; to: number }) => void
  getKey: (item: T, index: number) => string
  renderItem: (item: T, index: number) => ReactNode
  itemClassName?: string
}

export function SortableList<T>({ items, onReorder, getKey, renderItem, itemClassName }: Props<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const finishDrag = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const move = useCallback(
    (from: number, to: number) => {
      if (from === to) return
      onReorder(reorderList(items, from, to), { from, to })
    },
    [items, onReorder],
  )

  const handleDrop = (toIndex: number) => (e: React.DragEvent) => {
    e.preventDefault()
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from)) move(from, toIndex)
    finishDrag()
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isDragging = dragIndex === index
        const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
        return (
          <div
            key={getKey(item, index)}
            className={`relative transition-all duration-200 ${itemClassName ?? ''} ${
              isDragging ? 'scale-[0.98] opacity-50' : ''
            } ${isOver ? 'ring-2 ring-brand/40 ring-offset-2 ring-offset-panel' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setOverIndex(index)
            }}
            onDragLeave={() => {
              if (overIndex === index) setOverIndex(null)
            }}
            onDrop={handleDrop(index)}
          >
            <div className="mb-2 flex items-center gap-1">
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  setDragIndex(index)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', String(index))
                }}
                onDragEnd={finishDrag}
                className="cursor-grab touch-none rounded-md p-1.5 text-muted transition-colors hover:bg-bg-subtle hover:text-text active:cursor-grabbing"
                aria-label={`拖拽调整第 ${index + 1} 项顺序`}
              >
                <GripVertical className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <span className="flex-1 text-[11px] font-medium text-muted">第 {index + 1} 项</span>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                className="rounded-md p-1 text-muted transition-colors hover:bg-bg-subtle hover:text-text disabled:opacity-30"
                aria-label="上移"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => move(index, index + 1)}
                className="rounded-md p-1 text-muted transition-colors hover:bg-bg-subtle hover:text-text disabled:opacity-30"
                aria-label="下移"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            {renderItem(item, index)}
          </div>
        )
      })}
    </div>
  )
}
