import type { JobApplicationStatus } from '../../../api/client'

export type WorkbenchTab = 'recommend' | 'jobs' | 'applications'

export const PIPELINE: JobApplicationStatus[] = [
  'applied',
  'viewed',
  'interview_invited',
  'interview_done',
  'offer',
]

export const STATUS_LABEL: Record<string, string> = {
  applied: '已打招呼',
  viewed: 'HR已读',
  interview_invited: '收到面试',
  interview_done: '模拟面试',
  offer: '已发Offer',
  rejected: '未通过',
}

export const TAB_LABEL: Record<WorkbenchTab, string> = {
  recommend: '今日推荐',
  jobs: '全网职位',
  applications: '我的招呼',
}
