import { getSql } from '../db/client.js'
import type {
  AuthUser,
  CandidateQuestion,
  CandidateQuestionStatus,
  Experience,
  InterviewReport,
  InterviewSession,
  Question,
  QuestionStatus,
  QuestionType,
  User,
  UserRole,
} from '../types/entities.js'
import { newId } from './store-json.js'
import { matchesQuestionSearch } from './question-search.js'
import {
  filterQuestionsBase,
  listQuestionsPageFromItems,
  type QuestionPageFilters,
} from './question-list-filters.js'

export type { QuestionPageFilters, QuestionListPage } from './question-list-filters.js'

type QuestionRow = {
  id: string
  user_id: string | null
  source_experience_id: string | null
  title: string
  category: string
  difficulty: string
  tags: string[]
  content: string
  views: number
  position: string[]
  type: string
  status: string
  reference_answer: string
  key_points: string[]
  scoring_rubric: string
  follow_up_templates: string[]
  created_at: Date
}

function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    sourceExperienceId: row.source_experience_id ?? undefined,
    title: row.title,
    category: row.category,
    difficulty: row.difficulty,
    tags: row.tags ?? [],
    content: row.content,
    views: row.views,
    position: row.position ?? [],
    type: row.type as QuestionType,
    status: row.status as QuestionStatus,
    referenceAnswer: row.reference_answer ?? '',
    keyPoints: row.key_points ?? [],
    scoringRubric: row.scoring_rubric ?? '',
    followUpTemplates: row.follow_up_templates ?? [],
    createdAt: row.created_at.toISOString(),
  }
}

export async function listQuestions(filters?: {
  category?: string
  search?: string
  status?: string
}) {
  const db = getSql()
  const result = await db`SELECT * FROM questions ORDER BY created_at DESC`
  let rows = [...(result as unknown as QuestionRow[])]

  if (filters?.category && filters.category !== '全部') {
    rows = rows.filter((r) => r.category === filters.category)
  }
  if (filters?.status && filters.status !== '全部') {
    rows = rows.filter((r) => r.status === filters.status)
  }
  if (filters?.search) {
    rows = rows.filter((r) => matchesQuestionSearch(r, filters.search!))
  }
  return rows.map(mapQuestion)
}

export async function listQuestionsPage(filters?: QuestionPageFilters) {
  const db = getSql()
  const result = await db`SELECT * FROM questions ORDER BY created_at DESC`
  const all = (result as unknown as QuestionRow[]).map(mapQuestion)
  return listQuestionsPageFromItems(all, filters)
}

export async function getQuestion(id: string) {
  const db = getSql()
  const rows = await db<QuestionRow[]>`SELECT * FROM questions WHERE id = ${id}`
  return rows[0] ? mapQuestion(rows[0]) : null
}

export async function createQuestion(input: Omit<Question, 'id' | 'views' | 'createdAt'>) {
  const db = getSql()
  const id = newId('q')
  const rows = await db<QuestionRow[]>`
    INSERT INTO questions (
      id, user_id, source_experience_id, title, category, difficulty, tags, content,
      views, position, type, status, reference_answer, key_points, scoring_rubric, follow_up_templates
    ) VALUES (
      ${id}, ${input.userId ?? null}, ${input.sourceExperienceId ?? null},
      ${input.title}, ${input.category}, ${input.difficulty},
      ${db.json(input.tags ?? [])}, ${input.content}, 0,
      ${db.json(input.position ?? [])}, ${input.type ?? '基础'}, ${input.status ?? 'draft'},
      ${input.referenceAnswer ?? ''}, ${db.json(input.keyPoints ?? [])},
      ${input.scoringRubric ?? ''}, ${db.json(input.followUpTemplates ?? [])}
    ) RETURNING *
  `
  return mapQuestion(rows[0])
}

export async function updateQuestion(id: string, patch: Partial<Omit<Question, 'id' | 'createdAt'>>) {
  const existing = await getQuestion(id)
  if (!existing) return null
  const merged = { ...existing, ...patch, id }
  const db = getSql()
  const rows = await db<QuestionRow[]>`
    UPDATE questions SET
      title = ${merged.title},
      category = ${merged.category},
      difficulty = ${merged.difficulty},
      tags = ${db.json(merged.tags)},
      content = ${merged.content},
      views = ${merged.views},
      position = ${db.json(merged.position ?? [])},
      type = ${merged.type ?? '基础'},
      status = ${merged.status ?? 'draft'},
      reference_answer = ${merged.referenceAnswer ?? ''},
      key_points = ${db.json(merged.keyPoints ?? [])},
      scoring_rubric = ${merged.scoringRubric ?? ''},
      follow_up_templates = ${db.json(merged.followUpTemplates ?? [])},
      source_experience_id = ${merged.sourceExperienceId ?? null}
    WHERE id = ${id}
    RETURNING *
  `
  return mapQuestion(rows[0])
}

export async function deleteQuestion(id: string) {
  const db = getSql()
  const result = await db`DELETE FROM questions WHERE id = ${id}`
  return result.count > 0
}

export async function incrementQuestionViews(id: string) {
  const db = getSql()
  const rows = await db<QuestionRow[]>`
    UPDATE questions SET views = views + 1 WHERE id = ${id} RETURNING *
  `
  return rows[0] ? mapQuestion(rows[0]) : null
}

export async function listExperiences(options?: { status?: string; includeAll?: boolean }) {
  const db = getSql()
  const status = options?.status
  const rows = status
    ? await db<
        {
          id: string
          user_id: string | null
          company: string
          position: string
          result: string
          rounds: number
          author: string
          date: string
          summary: string
          content: string
          status: string
          created_at: Date
        }[]
      >`SELECT * FROM experiences WHERE status = ${status} ORDER BY created_at DESC`
    : options?.includeAll
      ? await db<
          {
            id: string
            user_id: string | null
            company: string
            position: string
            result: string
            rounds: number
            author: string
            date: string
            summary: string
            content: string
            status: string
            created_at: Date
          }[]
        >`SELECT * FROM experiences ORDER BY created_at DESC`
      : await db<
          {
            id: string
            user_id: string | null
            company: string
            position: string
            result: string
            rounds: number
            author: string
            date: string
            summary: string
            content: string
            status: string
            created_at: Date
          }[]
        >`SELECT * FROM experiences WHERE status = 'published' ORDER BY created_at DESC`

  return rows.map((r) => mapExperienceRow(r as Parameters<typeof mapExperienceRow>[0]))
}

export async function getExperience(id: string) {
  const db = getSql()
  const rows = await db<
    {
      id: string
      user_id: string | null
      company: string
      position: string
      result: string
      rounds: number
      author: string
      date: string
      summary: string
      content: string
      status: string
      source_report_id: string | null
      source_type: string | null
      created_at: Date
    }[]
  >`SELECT * FROM experiences WHERE id = ${id}`
  const r = rows[0]
  if (!r) return null
  return mapExperienceRow(r)
}

function mapExperienceRow(r: {
  id: string
  user_id: string | null
  company: string
  position: string
  result: string
  rounds: number
  author: string
  date: string
  summary: string
  content: string
  status: string
  source_report_id?: string | null
  source_type?: string | null
  created_at: Date
}): Experience {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    company: r.company,
    position: r.position,
    result: r.result,
    rounds: r.rounds,
    author: r.author,
    date: r.date,
    summary: r.summary,
    content: r.content,
    status: (r.status as Experience['status']) ?? 'published',
    sourceReportId: r.source_report_id ?? undefined,
    sourceType: (r.source_type as Experience['sourceType']) ?? undefined,
    createdAt: r.created_at.toISOString(),
  }
}

export async function findExperienceByReportId(reportId: string) {
  const db = getSql()
  const rows = await db<
    {
      id: string
      user_id: string | null
      company: string
      position: string
      result: string
      rounds: number
      author: string
      date: string
      summary: string
      content: string
      status: string
      source_report_id: string | null
      source_type: string | null
      created_at: Date
    }[]
  >`SELECT * FROM experiences WHERE source_report_id = ${reportId} LIMIT 1`
  const r = rows[0]
  return r ? mapExperienceRow(r) : null
}

export async function createExperience(input: Omit<Experience, 'id' | 'createdAt'>) {
  const db = getSql()
  const id = newId('e')
  const rows = await db`
    INSERT INTO experiences (
      id, user_id, company, position, result, rounds, author, date, summary, content, status,
      source_report_id, source_type
    )
    VALUES (
      ${id}, ${input.userId ?? null}, ${input.company}, ${input.position}, ${input.result},
      ${input.rounds}, ${input.author}, ${input.date}, ${input.summary}, ${input.content},
      ${input.status ?? 'published'}, ${input.sourceReportId ?? null}, ${input.sourceType ?? null}
    )
    RETURNING *
  `
  const r = rows[0] as Parameters<typeof mapExperienceRow>[0]
  return mapExperienceRow(r)
}

export async function updateExperience(id: string, patch: Partial<Omit<Experience, 'id' | 'createdAt'>>) {
  const existing = await getExperience(id)
  if (!existing) return null
  const merged = { ...existing, ...patch }
  const db = getSql()
  await db`
    UPDATE experiences SET
      company = ${merged.company}, position = ${merged.position}, result = ${merged.result},
      rounds = ${merged.rounds}, author = ${merged.author}, date = ${merged.date},
      summary = ${merged.summary}, content = ${merged.content},
      status = ${merged.status ?? 'published'}
    WHERE id = ${id}
  `
  return merged
}

export async function deleteExperience(id: string) {
  const db = getSql()
  const result = await db`DELETE FROM experiences WHERE id = ${id}`
  return result.count > 0
}

export async function listReports(userId?: string) {
  const db = getSql()
  const rows = userId
    ? await db`SELECT * FROM reports WHERE user_id = ${userId} ORDER BY created_at DESC`
    : await db`SELECT * FROM reports ORDER BY created_at DESC`

  return rows.map((r) => mapReport(r as Record<string, unknown>))
}

function mapReport(r: Record<string, unknown>): InterviewReport {
  return {
    id: r.id as string,
    sessionId: r.session_id as string,
    userId: (r.user_id as string) ?? undefined,
    position: r.position as string,
    experience: r.experience as string,
    totalScore: r.total_score as number,
    answerCount: r.answer_count as number,
    summary: r.summary as string,
    strengths: r.strengths as string[],
    improvements: r.improvements as string[],
    overallRating: r.overall_rating as string,
    nextSteps: r.next_steps as string[],
    scoreBreakdown: r.score_breakdown as InterviewReport['scoreBreakdown'],
    transcript: r.transcript as InterviewReport['transcript'],
    rounds: r.rounds as InterviewReport['rounds'],
    sourceQuestionId: (r.source_question_id as string) ?? undefined,
    sourceCategory: (r.source_category as string) ?? undefined,
    applicationId: (r.application_id as string) ?? undefined,
    createdAt: (r.created_at as Date).toISOString(),
  }
}

export async function getReport(id: string) {
  const db = getSql()
  const rows = await db`SELECT * FROM reports WHERE id = ${id}`
  return rows[0] ? mapReport(rows[0] as Record<string, unknown>) : null
}

export async function createInterviewReport(
  input: Omit<InterviewReport, 'id' | 'createdAt'>,
): Promise<InterviewReport> {
  const db = getSql()
  const id = newId('rpt')
  const rows = await db`
    INSERT INTO reports (
      id, session_id, user_id, position, experience, total_score, answer_count,
      summary, strengths, improvements, overall_rating, next_steps,
      score_breakdown, transcript, rounds, source_question_id, source_category, application_id
    ) VALUES (
      ${id}, ${input.sessionId}, ${input.userId ?? null}, ${input.position}, ${input.experience},
      ${input.totalScore}, ${input.answerCount}, ${input.summary},
      ${db.json(input.strengths)}, ${db.json(input.improvements)}, ${input.overallRating},
      ${db.json(input.nextSteps)}, ${db.json(input.scoreBreakdown)},
      ${db.json(input.transcript)}, ${db.json(input.rounds)},
      ${input.sourceQuestionId ?? null}, ${input.sourceCategory ?? null}, ${input.applicationId ?? null}
    ) RETURNING *
  `
  return mapReport(rows[0] as Record<string, unknown>)
}

export async function deleteReport(id: string) {
  const db = getSql()
  const result = await db`DELETE FROM reports WHERE id = ${id}`
  return result.count > 0
}

export async function getInterviewSession(id: string) {
  const db = getSql()
  const rows = await db<{ data: InterviewSession }[]>`
    SELECT data FROM sessions WHERE id = ${id}
  `
  return rows[0]?.data ?? null
}

export async function saveInterviewSession(session: InterviewSession) {
  const db = getSql()
  await db`
    INSERT INTO sessions (id, user_id, data, created_at)
    VALUES (${session.id}, ${session.userId ?? null}, ${db.json(session)}, to_timestamp(${session.createdAt / 1000}))
    ON CONFLICT (id) DO UPDATE SET data = ${db.json(session)}, user_id = ${session.userId ?? null}
  `
}

export async function deleteInterviewSession(id: string) {
  const db = getSql()
  const result = await db`DELETE FROM sessions WHERE id = ${id}`
  return result.count > 0
}

export async function listSessions() {
  const db = getSql()
  const rows = await db<{ data: InterviewSession }[]>`SELECT data FROM sessions`
  return rows.map((r) => r.data)
}

export async function purgeExpiredSessions(maxAgeMs = 24 * 60 * 60 * 1000) {
  const db = getSql()
  const cutoff = new Date(Date.now() - maxAgeMs)
  await db`DELETE FROM sessions WHERE created_at < ${cutoff}`
}

export async function getMetricCounter(name: string) {
  const db = getSql()
  const rows = await db<{ value: string }[]>`
    SELECT value FROM metric_counters WHERE name = ${name}
  `
  return rows[0] ? Number(rows[0].value) : 0
}

export async function incrementMetricCounter(name: string, delta = 1) {
  const db = getSql()
  await db`
    INSERT INTO metric_counters (name, value, updated_at)
    VALUES (${name}, ${delta}, NOW())
    ON CONFLICT (name) DO UPDATE SET
      value = metric_counters.value + ${delta},
      updated_at = NOW()
  `
}

export async function getAllMetricCounters() {
  const db = getSql()
  const rows = await db<{ name: string; value: string }[]>`SELECT name, value FROM metric_counters`
  const result: Record<string, number> = {}
  for (const row of rows) result[row.name] = Number(row.value)
  return result
}

export async function getUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const db = getSql()
  const rows = await db<
    { id: string; email: string; password_hash: string; name: string; role: string; created_at: Date }[]
  >`SELECT * FROM users WHERE email = ${email.toLowerCase()}`
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    name: r.name,
    role: r.role as UserRole,
    createdAt: r.created_at.toISOString(),
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getSql()
  const rows = await db<
    { id: string; email: string; name: string; role: string; created_at: Date }[]
  >`SELECT id, email, name, role, created_at FROM users WHERE id = ${id}`
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role as UserRole,
    createdAt: r.created_at.toISOString(),
  }
}

export async function createUser(input: {
  email: string
  passwordHash: string
  name: string
  role?: UserRole
}) {
  const db = getSql()
  const id = newId('usr_')
  const rows = await db`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (${id}, ${input.email.toLowerCase()}, ${input.passwordHash}, ${input.name}, ${input.role ?? 'user'})
    RETURNING id, email, name, role, created_at
  `
  const r = rows[0] as { id: string; email: string; name: string; role: string; created_at: Date }
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role as UserRole,
    createdAt: r.created_at.toISOString(),
  } satisfies User
}

export async function listUsers() {
  const db = getSql()
  const rows = await db<
    { id: string; email: string; name: string; role: string; created_at: Date }[]
  >`SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC`
  return rows.map(
    (r): User => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role as UserRole,
      createdAt: r.created_at.toISOString(),
    }),
  )
}

export async function updateUserRole(id: string, role: UserRole) {
  const db = getSql()
  const rows = await db<
    { id: string; email: string; name: string; role: string; created_at: Date }[]
  >`
    UPDATE users SET role = ${role}
    WHERE id = ${id}
    RETURNING id, email, name, role, created_at
  `
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role as UserRole,
    createdAt: r.created_at.toISOString(),
  } satisfies User
}

export async function getLlmCache(key: string) {
  const db = getSql()
  const rows = await db<{ response: string; prompt_variant: string }[]>`
    SELECT response, prompt_variant FROM llm_cache
    WHERE cache_key = ${key} AND expires_at > NOW()
  `
  return rows[0] ?? null
}

export async function setLlmCache(key: string, response: string, variant: string, ttlMs: number) {
  const db = getSql()
  const expiresAt = new Date(Date.now() + ttlMs)
  await db`
    INSERT INTO llm_cache (cache_key, response, prompt_variant, expires_at)
    VALUES (${key}, ${response}, ${variant}, ${expiresAt})
    ON CONFLICT (cache_key) DO UPDATE SET
      response = ${response}, prompt_variant = ${variant}, expires_at = ${expiresAt}
  `
}

export async function purgeExpiredLlmCache() {
  const db = getSql()
  await db`DELETE FROM llm_cache WHERE expires_at < NOW()`
}

export async function getActivePromptVariants() {
  const db = getSql()
  const rows = await db<
    { id: string; name: string; weight: number; active: boolean; suffix: string }[]
  >`SELECT id, name, weight, active, suffix FROM llm_prompt_variants WHERE active = TRUE`

  if (!rows.length) {
    return [{ id: 'default', name: 'default', weight: 100, active: true, suffix: '' }]
  }
  return rows
}

export async function ensureDefaultPromptVariants() {
  const db = getSql()
  const rows = await db`SELECT id FROM llm_prompt_variants WHERE id = 'default'`
  if (!rows.length) {
    await db`
      INSERT INTO llm_prompt_variants (id, name, weight, active, suffix)
      VALUES
        ('default', 'default', 100, TRUE, ''),
        ('concise', 'concise', 50, TRUE, '回答尽量简洁，一次只问一个问题。'),
        ('deep', 'deep', 50, TRUE, '适当追问底层原理和项目细节。')
    `
  }
}

type CandidateRow = {
  id: string
  experience_id: string
  title: string
  category: string
  difficulty: string
  tags: string[]
  content: string
  type: string
  reference_answer: string
  key_points: string[]
  scoring_rubric: string
  follow_up_templates: string[]
  status: string
  created_at: Date
}

function mapCandidate(row: CandidateRow): CandidateQuestion {
  return {
    id: row.id,
    experienceId: row.experience_id,
    title: row.title,
    category: row.category,
    difficulty: row.difficulty,
    tags: row.tags ?? [],
    content: row.content,
    type: row.type as QuestionType,
    referenceAnswer: row.reference_answer,
    keyPoints: row.key_points ?? [],
    scoringRubric: row.scoring_rubric,
    followUpTemplates: row.follow_up_templates ?? [],
    status: row.status as CandidateQuestionStatus,
    createdAt: row.created_at.toISOString(),
  }
}

export async function listCandidateQuestions(status?: string) {
  const db = getSql()
  const rows = status
    ? await db<CandidateRow[]>`
        SELECT * FROM candidate_questions WHERE status = ${status} ORDER BY created_at DESC
      `
    : await db<CandidateRow[]>`SELECT * FROM candidate_questions ORDER BY created_at DESC`
  return rows.map(mapCandidate)
}

export async function getCandidateQuestion(id: string) {
  const db = getSql()
  const rows = await db<CandidateRow[]>`SELECT * FROM candidate_questions WHERE id = ${id}`
  return rows[0] ? mapCandidate(rows[0]) : null
}

export async function createCandidateQuestion(
  input: Omit<CandidateQuestion, 'id' | 'createdAt'>,
) {
  const db = getSql()
  const id = newId('cq_')
  const rows = await db<CandidateRow[]>`
    INSERT INTO candidate_questions (
      id, experience_id, title, category, difficulty, tags, content, type,
      reference_answer, key_points, scoring_rubric, follow_up_templates, status
    ) VALUES (
      ${id}, ${input.experienceId}, ${input.title}, ${input.category}, ${input.difficulty},
      ${db.json(input.tags)}, ${input.content}, ${input.type},
      ${input.referenceAnswer}, ${db.json(input.keyPoints)}, ${input.scoringRubric},
      ${db.json(input.followUpTemplates)}, ${input.status}
    ) RETURNING *
  `
  return mapCandidate(rows[0])
}

export async function updateCandidateQuestion(
  id: string,
  patch: Partial<Omit<CandidateQuestion, 'id' | 'createdAt' | 'experienceId'>>,
) {
  const existing = await getCandidateQuestion(id)
  if (!existing) return null
  const merged = { ...existing, ...patch }
  const db = getSql()
  const rows = await db<CandidateRow[]>`
    UPDATE candidate_questions SET
      title = ${merged.title}, category = ${merged.category}, difficulty = ${merged.difficulty},
      tags = ${db.json(merged.tags)}, content = ${merged.content}, type = ${merged.type},
      reference_answer = ${merged.referenceAnswer}, key_points = ${db.json(merged.keyPoints)},
      scoring_rubric = ${merged.scoringRubric}, follow_up_templates = ${db.json(merged.followUpTemplates)},
      status = ${merged.status}
    WHERE id = ${id}
    RETURNING *
  `
  return mapCandidate(rows[0])
}

export async function countQuestionsByStatus() {
  const db = getSql()
  const rows = await db<{ status: string; count: string }[]>`
    SELECT status, COUNT(*)::text AS count FROM questions GROUP BY status
  `
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]))
}

export function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}
