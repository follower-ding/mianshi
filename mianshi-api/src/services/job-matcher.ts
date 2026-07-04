import type { JobMatchTier, JobPosting, JobPreference } from '../types/entities.js'
import { parseSalaryK } from './boss-crawler.js'

export type MatchResult = {
  score: number
  tier: JobMatchTier
  reasons: string[]
  skip: boolean
}

function includesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((k) => k && lower.includes(k.toLowerCase()))
}

function positionMatch(job: JobPosting, positions: string[]): { score: number; reason?: string } {
  const hay = `${job.title} ${job.position} ${job.jd} ${job.tags.join(' ')}`
  for (const p of positions) {
    if (!p) continue
    const key = p.replace(/\s+/g, '')
    if (hay.includes(p) || hay.replace(/\s+/g, '').includes(key)) {
      return { score: 25, reason: `岗位匹配：${p}` }
    }
  }
  return { score: 5, reason: '岗位弱匹配' }
}

function companyMatch(job: JobPosting, companies: string[]): { score: number; reason?: string } {
  for (const c of companies) {
    if (c && job.company.includes(c)) {
      return { score: 25, reason: `目标公司：${c}` }
    }
  }
  return { score: 0 }
}

function cityMatch(job: JobPosting, cities: string[]): { score: number; reason?: string } {
  if (cities.length === 0) return { score: 10 }
  for (const c of cities) {
    if (c && job.city.includes(c)) return { score: 15, reason: `城市：${c}` }
  }
  return { score: 0 }
}

function salaryMatch(job: JobPosting, pref: JobPreference): { score: number; reason?: string } {
  const parsed = parseSalaryK(job.salary)
  if (!parsed || pref.salaryMin == null || pref.salaryMax == null) return { score: 8 }
  const overlap = parsed.max >= pref.salaryMin && parsed.min <= pref.salaryMax
  if (overlap) return { score: 15, reason: `薪资 ${job.salary} 符合预期` }
  return { score: 0, reason: `薪资 ${job.salary} 偏离区间` }
}

function freshnessScore(job: JobPosting): { score: number; reason?: string } {
  if (!job.crawledAt) return { score: 0 }
  const ageH = (Date.now() - new Date(job.crawledAt).getTime()) / 3600_000
  if (ageH <= 24) return { score: 10, reason: '24 小时内新抓取' }
  if (ageH <= 72) return { score: 5, reason: '近 3 日抓取' }
  return { score: 0 }
}

export function scoreJobForUser(job: JobPosting, pref: JobPreference): MatchResult {
  const text = `${job.title} ${job.company} ${job.jd}`
  if (includesAny(text, pref.excludeKeywords)) {
    return { score: 0, tier: 'C', reasons: ['命中排除关键词'], skip: true }
  }

  const reasons: string[] = []
  let score = 0

  const cm = companyMatch(job, pref.targetCompanies)
  score += cm.score
  if (cm.reason) reasons.push(cm.reason)

  const pm = positionMatch(job, pref.targetPositions)
  score += pm.score
  if (pm.reason) reasons.push(pm.reason)

  const cim = cityMatch(job, pref.targetCities)
  score += cim.score
  if (cim.reason) reasons.push(cim.reason)

  const sm = salaryMatch(job, pref)
  score += sm.score
  if (sm.reason) reasons.push(sm.reason)

  const fs = freshnessScore(job)
  score += fs.score
  if (fs.reason) reasons.push(fs.reason)

  if (job.source === 'boss') {
    score += 5
    reasons.push('来源：Boss 直聘')
  }

  score = Math.min(100, Math.max(0, score))
  const tier: JobMatchTier = score >= 80 ? 'S' : score >= 65 ? 'A' : score >= 50 ? 'B' : 'C'

  return { score, tier, reasons, skip: tier === 'C' && score < 40 }
}
