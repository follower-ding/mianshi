export * from '../types/entities.js'
export { newId } from './store-json.js'

import { isPgEnabled } from '../db/client.js'
import * as json from './store-json.js'
import * as pg from './store-pg.js'

const usePg = isPgEnabled

function wrap<T>(jsonFn: () => T, pgFn: () => Promise<T>): Promise<T> {
  return usePg() ? pgFn() : Promise.resolve(jsonFn())
}

export async function listQuestions(filters?: Parameters<typeof json.listQuestions>[0]) {
  return wrap(() => json.listQuestions(filters), () => pg.listQuestions(filters))
}

export async function listQuestionsPage(filters?: Parameters<typeof json.listQuestionsPage>[0]) {
  return wrap(() => json.listQuestionsPage(filters), () => pg.listQuestionsPage(filters))
}

export async function getQuestion(id: string) {
  return wrap(() => json.getQuestion(id), () => pg.getQuestion(id))
}

export async function createQuestion(input: Parameters<typeof json.createQuestion>[0]) {
  return wrap(() => json.createQuestion(input), () => pg.createQuestion(input))
}

export async function updateQuestion(id: string, patch: Parameters<typeof json.updateQuestion>[1]) {
  return wrap(() => json.updateQuestion(id, patch), () => pg.updateQuestion(id, patch))
}

export async function deleteQuestion(id: string) {
  return wrap(() => json.deleteQuestion(id), () => pg.deleteQuestion(id))
}

export async function incrementQuestionViews(id: string) {
  return wrap(() => json.incrementQuestionViews(id), () => pg.incrementQuestionViews(id))
}

export async function listExperiences(options?: { status?: string; includeAll?: boolean }) {
  return wrap(
    () => json.listExperiences(options),
    () => pg.listExperiences(options),
  )
}

export async function getExperience(id: string) {
  return wrap(() => json.getExperience(id), () => pg.getExperience(id))
}

export async function findExperienceByReportId(reportId: string) {
  return wrap(
    () => json.findExperienceByReportId(reportId),
    () => pg.findExperienceByReportId(reportId),
  )
}

export async function createExperience(input: Parameters<typeof json.createExperience>[0]) {
  return wrap(() => json.createExperience(input), () => pg.createExperience(input))
}

export async function updateExperience(id: string, patch: Parameters<typeof json.updateExperience>[1]) {
  return wrap(() => json.updateExperience(id, patch), () => pg.updateExperience(id, patch))
}

export async function deleteExperience(id: string) {
  return wrap(() => json.deleteExperience(id), () => pg.deleteExperience(id))
}

export async function listReports(userId?: string) {
  return wrap(() => json.listReports(userId), () => pg.listReports(userId))
}

export async function getReport(id: string) {
  return wrap(() => json.getReport(id), () => pg.getReport(id))
}

export async function createInterviewReport(input: Parameters<typeof json.createInterviewReport>[0]) {
  return wrap(() => json.createInterviewReport(input), () => pg.createInterviewReport(input))
}

export async function deleteReport(id: string) {
  return wrap(() => json.deleteReport(id), () => pg.deleteReport(id))
}

export async function getInterviewSession(id: string) {
  return wrap(() => json.getInterviewSession(id), () => pg.getInterviewSession(id))
}

export async function saveInterviewSession(session: Parameters<typeof json.saveInterviewSession>[0]) {
  return wrap(
    () => {
      json.saveInterviewSession(session)
    },
    async () => {
      await pg.saveInterviewSession(session)
    },
  )
}

export async function deleteInterviewSession(id: string) {
  return wrap(() => json.deleteInterviewSession(id), () => pg.deleteInterviewSession(id))
}

export async function listSessions() {
  return wrap(() => json.listSessions(), () => pg.listSessions())
}

export async function purgeExpiredSessions(maxAgeMs?: number) {
  return wrap(
    () => {
      json.purgeExpiredSessions(maxAgeMs)
    },
    async () => {
      await pg.purgeExpiredSessions(maxAgeMs)
    },
  )
}

export async function getMetricCounter(name: string) {
  return wrap(() => json.getMetricCounter(name), () => pg.getMetricCounter(name))
}

export async function incrementMetricCounter(name: string, delta = 1) {
  if (usePg()) return pg.incrementMetricCounter(name, delta)
  return json.incrementMetricCounter(name, delta)
}

export async function getAllMetricCounters() {
  if (!usePg()) return {}
  return pg.getAllMetricCounters()
}

export async function getUserByEmail(email: string) {
  if (!usePg()) return json.getUserByEmail(email)
  return pg.getUserByEmail(email)
}

export async function getUserById(id: string) {
  if (!usePg()) return json.getUserById(id)
  return pg.getUserById(id)
}

export async function createUser(input: Parameters<typeof pg.createUser>[0]) {
  if (!usePg()) throw new Error('User auth requires PostgreSQL (set DATABASE_URL)')
  return pg.createUser(input)
}

export async function listUsers() {
  if (!usePg()) return json.listUsers()
  return pg.listUsers()
}

export async function updateUserRole(id: string, role: 'user' | 'admin') {
  if (!usePg()) throw new Error('User management requires PostgreSQL')
  return pg.updateUserRole(id, role)
}

export async function getLlmCache(key: string) {
  if (!usePg()) return json.getLlmCache(key)
  return pg.getLlmCache(key)
}

export async function setLlmCache(key: string, response: string, variant: string, ttlMs: number) {
  if (!usePg()) return json.setLlmCache(key, response, variant, ttlMs)
  return pg.setLlmCache(key, response, variant, ttlMs)
}

export async function purgeExpiredLlmCache() {
  if (!usePg()) return json.purgeExpiredLlmCache()
  return pg.purgeExpiredLlmCache()
}

export async function getActivePromptVariants() {
  if (!usePg()) return json.getActivePromptVariants()
  return pg.getActivePromptVariants()
}

export async function listCandidateQuestions(status?: string) {
  if (!usePg()) return json.listCandidateQuestions(status)
  return pg.listCandidateQuestions(status)
}

export async function getCandidateQuestion(id: string) {
  if (!usePg()) return json.getCandidateQuestion(id)
  return pg.getCandidateQuestion(id)
}

export async function createCandidateQuestion(input: Parameters<typeof pg.createCandidateQuestion>[0]) {
  if (!usePg()) throw new Error('Candidate questions require PostgreSQL')
  return pg.createCandidateQuestion(input)
}

export async function updateCandidateQuestion(
  id: string,
  patch: Parameters<typeof pg.updateCandidateQuestion>[1],
) {
  if (!usePg()) return json.updateCandidateQuestion(id, patch)
  return pg.updateCandidateQuestion(id, patch)
}

export async function countQuestionsByStatus() {
  if (!usePg()) {
    const items = json.listQuestions()
    return items.reduce<Record<string, number>>((acc, q) => {
      const s = q.status ?? 'published'
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    }, {})
  }
  return pg.countQuestionsByStatus()
}

export async function ensureDefaultPromptVariants() {
  if (usePg()) await pg.ensureDefaultPromptVariants()
}
