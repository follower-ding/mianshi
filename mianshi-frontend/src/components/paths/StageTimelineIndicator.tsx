import { Check } from 'lucide-react'
import type { StageStatus } from './pathLayout'

type Props = {
  status: StageStatus
  showConnector: boolean
}

export function StageTimelineIndicator({ status, showConnector }: Props) {
  return (
    <div className="relative flex flex-col items-center self-stretch pt-1">
      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
          status === 'completed'
            ? 'border-success bg-success text-white shadow-sm shadow-success/30'
            : status === 'active'
              ? 'border-brand bg-brand-light shadow-sm shadow-brand/20'
              : 'border-border bg-elevated'
        }`}
      >
        {status === 'completed' ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : status === 'active' ? (
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-border" />
        )}
      </div>
      {showConnector && (
        <div
          className={`mt-1 w-0.5 flex-1 min-h-[1.5rem] rounded-full ${
            status === 'completed' ? 'bg-success/40' : 'bg-border/70'
          }`}
          aria-hidden
        />
      )}
    </div>
  )
}
