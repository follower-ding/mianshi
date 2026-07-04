import { ShieldAlert } from 'lucide-react'

type Props = {
  reason?: string
  until?: string
}

export function BossSafetyBanner({ reason, until }: Props) {
  const untilLabel = until ? new Date(until).toLocaleString('zh-CN') : ''
  return (
    <div className="mx-auto mb-3 flex max-w-[1200px] items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100/90">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <div>
        <p className="font-medium text-amber-200">Boss 自动化已暂停（防封号保护）</p>
        <p className="mt-0.5 text-xs text-amber-100/80">
          {reason ?? '检测到风控信号'}
          {untilLabel ? `，预计恢复：${untilLabel}` : ''}
          。请重新绑定 Boss 或稍后再试；手动单条打招呼仍可在冷却结束后进行。
        </p>
      </div>
    </div>
  )
}
