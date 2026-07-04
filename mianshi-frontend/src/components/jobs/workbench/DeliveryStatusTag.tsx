import type { JobApplicationStatus } from '../../../api/client'
import { STATUS_LABEL } from './constants'

const TAG_STYLE: Partial<Record<JobApplicationStatus, string>> = {
  applied: 'bg-green-500/10 text-green-400 ring-green-500/20',
  viewed: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  interview_invited: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
  interview_done: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
  offer: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 ring-red-500/20',
}

const TAG_LABEL: Partial<Record<JobApplicationStatus, string>> = {
  interview_invited: '面试中',
  interview_done: '面试中',
}

type Props = {
  status: JobApplicationStatus
}

export function DeliveryStatusTag({ status }: Props) {
  const style = TAG_STYLE[status] ?? 'bg-gray-500/10 text-gray-400 ring-gray-500/20'
  const label = TAG_LABEL[status] ?? STATUS_LABEL[status] ?? status

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  )
}

