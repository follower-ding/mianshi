import { listReports, listSessions, incrementMetricCounter, getAllMetricCounters } from './store.js'
import { countTypeCoverage } from './question-selector.js'
import { isPgEnabled } from '../db/client.js'

const memoryCounters: Record<string, number> = {
  'interview.session_started': 0,
  'interview.session_finished': 0,
  'interview.round_scored': 0,
  'interview.llm_fallback': 0,
  'interview.follow_up': 0,
  'scoring.rule_only': 0,
  'scoring.llm_blended': 0,
  'llm.cache_hit': 0,
  'llm.cache_miss': 0,
  'llm.request': 0,
  'llm.stream': 0,
}

export async function incrementMetric(name: string, delta = 1) {
  memoryCounters[name] = (memoryCounters[name] ?? 0) + delta
  if (isPgEnabled()) {
    await incrementMetricCounter(name, delta)
  }
}

export async function getMetrics() {
  const pgCounters = isPgEnabled() ? await getAllMetricCounters() : {}
  const merged = isPgEnabled()
    ? { ...pgCounters }
    : { ...memoryCounters }
  return { ...merged, collectedAt: new Date().toISOString() }
}

export async function getQualityMetrics() {
  const base = (await getMetrics()) as Record<string, number | string>
  const sessions = await listSessions()
  const reports = await listReports()

  const started = Math.max(Number(base['interview.session_started'] ?? 0), sessions.length)
  const finished = Number(base['interview.session_finished'] ?? 0)
  const completionRate = started > 0 ? Math.round((finished / started) * 1000) / 10 : 0

  const recentSessions = sessions.slice(0, 50)
  const avgCoverage =
    recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + countTypeCoverage(s.questionPlan), 0) / recentSessions.length
      : 0

  const avgScore =
    reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.totalScore, 0) / reports.length)
      : 0

  return {
    ...base,
    quality: {
      sessionCompletionRate: completionRate,
      avgTypeCoverage: Math.round(avgCoverage * 10) / 10,
      avgInterviewScore: avgScore,
      totalReports: reports.length,
      sessionsWithFullRubric: sessions.filter((s) => s.questionPlan.every((q) => q.keyPoints.length)).length,
      llmFallbackRate:
        started > 0
          ? Math.round((Number(base['interview.llm_fallback'] ?? 0) / started) * 1000) / 10
          : 0,
      llmCacheHitRate:
        Number(base['llm.cache_hit'] ?? 0) + Number(base['llm.cache_miss'] ?? 0) > 0
          ? Math.round(
              (Number(base['llm.cache_hit'] ?? 0) /
                (Number(base['llm.cache_hit'] ?? 0) + Number(base['llm.cache_miss'] ?? 0))) *
                1000,
            ) / 10
          : 0,
    },
  }
}

export function resetMetrics() {
  for (const key of Object.keys(memoryCounters)) memoryCounters[key] = 0
}
