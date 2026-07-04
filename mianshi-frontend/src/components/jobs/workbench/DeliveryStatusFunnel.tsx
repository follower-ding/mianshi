import { CheckCircle2 } from 'lucide-react'
import { PIPELINE, STATUS_LABEL } from './constants'
import type { JobApplicationStatus } from '../../../api/client'

type Props = {
  status: JobApplicationStatus
  compact?: boolean
}

export function DeliveryStatusFunnel({ status, compact }: Props) {
  const stageIndex = PIPELINE.indexOf(status)
  const rejected = status === 'rejected'

  return (
    <div className={`flex flex-wrap items-center gap-1 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
      {PIPELINE.map((step, i) => {
        const done = !rejected && stageIndex >= i
        const active = status === step
        return (
          <div key={step} className="flex items-center gap-1">
            {i > 0 && <span className="text-border">›</span>}
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 whitespace-nowrap ${
                active
                  ? 'bg-brand/20 font-semibold text-brand'
                  : done
                    ? 'text-emerald-400/90'
                    : 'text-muted'
              }`}
            >
              {done && !active ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : null}
              {STATUS_LABEL[step]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
