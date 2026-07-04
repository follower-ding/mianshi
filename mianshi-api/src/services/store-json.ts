import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import seed from '../../data/seed.json' with { type: 'json' }
import seedExtra from '../../data/seed-extra.json' with { type: 'json' }
import seedExtra2 from '../../data/seed-extra2.json' with { type: 'json' }
import seedExtra3 from '../../data/seed-extra3.json' with { type: 'json' }
import type {
  Experience,
  InterviewReport,
  InterviewSession,
  Question,
} from '../types/entities.js'
import {
  filterQuestionsBase,
  listQuestionsPageFromItems,
  type QuestionPageFilters,
} from './question-list-filters.js'

export type { QuestionPageFilters, QuestionListPage } from './question-list-filters.js'
export { listQuestionsPageFromItems } from './question-list-filters.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../../data')
const DB_PATH = join(DATA_DIR, 'db.json')

type Db = {
  questions: Question[]
  experiences: Experience[]
  reports: InterviewReport[]
  sessions: InterviewSession[]
}

function normalizeQuestion(q: Question): Question {
  return {
    ...q,
    status: q.status ?? 'published',
    type: q.type ?? '基础',
    keyPoints: q.keyPoints ?? [],
    referenceAnswer: q.referenceAnswer ?? '',
    scoringRubric: q.scoringRubric ?? '',
    followUpTemplates: q.followUpTemplates ?? [],
    position: q.position ?? [],
  }
}

function normalizeDb(db: Db): Db {
  const seedQuestions = [
    ...(seed as Db).questions,
    ...(seedExtra as { questions: Question[] }).questions,
    ...(seedExtra2 as { questions: Question[] }).questions,
    ...(seedExtra3 as { questions: Question[] }).questions,
  ]
  db.questions = db.questions.map((q) => {
    const seedQ = seedQuestions.find((s) => s.id === q.id)
    const normalized = normalizeQuestion(q)
    if (seedQ?.keyPoints?.length && !normalized.keyPoints?.length) {
      return normalizeQuestion({
        ...normalized,
        ...seedQ,
        views: normalized.views,
        createdAt: normalized.createdAt,
      })
    }
    return normalized
  })
  for (const seedQ of seedQuestions) {
    if (!db.questions.some((q) => q.id === seedQ.id)) {
      db.questions.push(normalizeQuestion(seedQ as Question))
    }
  }
  if (!db.reports) db.reports = []
  if (!db.sessions) db.sessions = []
  return db
}

function ensureDb(): Db {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8')
    return normalizeDb({ ...(seed as Db), reports: [], sessions: [] })
  }
  return normalizeDb(JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Db)
}

function saveDb(db: Db) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

let cache: Db | null = null

function getDb(): Db {
  if (!cache) cache = ensureDb()
  return cache
}

function persist() {
  if (cache) saveDb(cache)
}

export function newId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function listQuestions(filters?: {
  category?: string
  search?: string
  status?: string
}) {
  let items = filterQuestionsBase(getDb().questions, filters)
  if (filters?.status && filters.status !== '全部') {
    items = items.filter((q) => (q.status ?? 'published') === filters.status)
  }
  return items
}

export function listQuestionsPage(filters?: QuestionPageFilters) {
  return listQuestionsPageFromItems(getDb().questions, filters)
}

export function getQuestion(id: string) {
  return getDb().questions.find((q) => q.id === id) ?? null
}

export function createQuestion(input: Omit<Question, 'id' | 'views' | 'createdAt'>) {
  const question: Question = normalizeQuestion({
    ...input,
    id: newId('q'),
    views: 0,
    createdAt: new Date().toISOString(),
  })
  getDb().questions.unshift(question)
  persist()
  return question
}

export function updateQuestion(id: string, patch: Partial<Omit<Question, 'id' | 'createdAt'>>) {
  const db = getDb()
  const idx = db.questions.findIndex((q) => q.id === id)
  if (idx < 0) return null
  db.questions[idx] = { ...db.questions[idx], ...patch, id }
  persist()
  return db.questions[idx]
}

export function deleteQuestion(id: string) {
  const db = getDb()
  const before = db.questions.length
  db.questions = db.questions.filter((q) => q.id !== id)
  if (db.questions.length === before) return false
  persist()
  return true
}

export function incrementQuestionViews(id: string) {
  const q = getQuestion(id)
  if (!q) return null
  return updateQuestion(id, { views: q.views + 1 })
}

export function listExperiences(options?: { status?: string; includeAll?: boolean }) {
  let items = [...getDb().experiences].map((e) => ({
    ...e,
    status: e.status ?? 'published',
  }))
  if (options?.status) {
    items = items.filter((e) => e.status === options.status)
  } else if (!options?.includeAll) {
    items = items.filter((e) => (e.status ?? 'published') === 'published')
  }
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function getExperience(id: string) {
  return getDb().experiences.find((e) => e.id === id) ?? null
}

export function findExperienceByReportId(reportId: string) {
  return getDb().experiences.find((e) => e.sourceReportId === reportId) ?? null
}

export function createExperience(input: Omit<Experience, 'id' | 'createdAt'>) {
  const experience: Experience = {
    ...input,
    status: input.status ?? 'published',
    id: newId('e'),
    createdAt: new Date().toISOString(),
  }
  getDb().experiences.unshift(experience)
  persist()
  return experience
}

export function updateExperience(id: string, patch: Partial<Omit<Experience, 'id' | 'createdAt'>>) {
  const db = getDb()
  const idx = db.experiences.findIndex((e) => e.id === id)
  if (idx < 0) return null
  db.experiences[idx] = { ...db.experiences[idx], ...patch, id }
  persist()
  return db.experiences[idx]
}

export function deleteExperience(id: string) {
  const db = getDb()
  const before = db.experiences.length
  db.experiences = db.experiences.filter((e) => e.id !== id)
  if (db.experiences.length === before) return false
  persist()
  return true
}

export function listReports(userId?: string) {
  let items = [...getDb().reports]
  if (userId) items = items.filter((r) => r.userId === userId)
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function getReport(id: string) {
  return getDb().reports.find((r) => r.id === id) ?? null
}

export function createInterviewReport(
  input: Omit<InterviewReport, 'id' | 'createdAt'>,
): InterviewReport {
  const report: InterviewReport = {
    ...input,
    id: newId('rpt'),
    createdAt: new Date().toISOString(),
  }
  getDb().reports.unshift(report)
  persist()
  return report
}

export function deleteReport(id: string) {
  const db = getDb()
  const before = db.reports.length
  db.reports = db.reports.filter((r) => r.id !== id)
  if (db.reports.length === before) return false
  persist()
  return true
}

export function getInterviewSession(id: string) {
  return getDb().sessions.find((s) => s.id === id) ?? null
}

export function saveInterviewSession(session: InterviewSession) {
  const db = getDb()
  const idx = db.sessions.findIndex((s) => s.id === session.id)
  if (idx >= 0) db.sessions[idx] = session
  else db.sessions.unshift(session)
  persist()
}

export function deleteInterviewSession(id: string) {
  const db = getDb()
  const before = db.sessions.length
  db.sessions = db.sessions.filter((s) => s.id !== id)
  if (db.sessions.length === before) return false
  persist()
  return true
}

export function listSessions() {
  return [...getDb().sessions]
}

export function purgeExpiredSessions(maxAgeMs = 24 * 60 * 60 * 1000) {
  const db = getDb()
  const cutoff = Date.now() - maxAgeMs
  const before = db.sessions.length
  db.sessions = db.sessions.filter((s) => s.createdAt >= cutoff)
  if (db.sessions.length !== before) persist()
}

export function getMetricCounter(name: string) {
  return 0
}

export async function incrementMetricCounter(_name: string, _delta = 1) {
  // JSON mode: metrics stay in-memory via metrics.ts
}

export function listCandidateQuestions(_status?: string) {
  return []
}

export function getCandidateQuestion(_id: string) {
  return null
}

export function createCandidateQuestion(_input: unknown) {
  throw new Error('Candidate questions require PostgreSQL')
}

export function updateCandidateQuestion(_id: string, _patch: unknown) {
  return null
}

export function getUserByEmail(_email: string) {
  return null
}

export function getUserById(_id: string) {
  return null
}

export function createUser(_input: unknown) {
  throw new Error('User auth requires PostgreSQL')
}

export function listUsers() {
  return []
}

export function getLlmCache(_key: string) {
  return null
}

export async function setLlmCache(_key: string, _response: string, _variant: string, _ttlMs: number) {}

export async function purgeExpiredLlmCache() {}

export function getActivePromptVariants() {
  return [{ id: 'default', name: 'default', weight: 100, active: true, suffix: '' }]
}
