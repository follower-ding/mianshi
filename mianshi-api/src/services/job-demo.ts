import type { JobPosting } from '../types/entities.js'

type DemoJobLike =
  | Partial<Pick<JobPosting, 'externalId' | 'jd' | 'source'>>
  | undefined

export function isDemoJob(job: DemoJobLike): boolean {
  if (!job) return false
  if (job.externalId?.startsWith('demo-')) return true
  if (job.jd?.includes('演示数据')) return true
  return false
}

/** SQL fragment: job_postings 演示岗位条件（用于 JOIN 过滤） */
export const DEMO_JOB_SQL = `(j.external_id LIKE 'demo-%' OR j.jd LIKE '%演示数据%')`

export function filterOutDemoJobs<T extends { job?: JobPosting }>(items: T[]): T[] {
  return items.filter((m) => !isDemoJob(m.job))
}
