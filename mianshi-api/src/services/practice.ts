import { getSql, isPgEnabled } from '../db/client.js'

export type PracticeStatus = 'practiced' | 'mastered'

export type QuestionProgress = {
  questionId: string
  status: PracticeStatus
  favorite: boolean
  updatedAt: string
}

type ProgressRow = {
  question_id: string
  status: string
  favorite: boolean
  updated_at: Date
}

function mapRow(row: ProgressRow): QuestionProgress {
  return {
    questionId: row.question_id,
    status: row.status as PracticeStatus,
    favorite: row.favorite,
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listUserProgress(userId: string): Promise<QuestionProgress[]> {
  if (!isPgEnabled()) return []
  const db = getSql()
  const rows = await db<ProgressRow[]>`
    SELECT question_id, status, favorite, updated_at
    FROM user_question_progress
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `
  return rows.map(mapRow)
}

export async function upsertUserProgress(
  userId: string,
  questionId: string,
  patch: { status?: PracticeStatus; favorite?: boolean },
): Promise<QuestionProgress> {
  if (!isPgEnabled()) throw new Error('Practice sync requires PostgreSQL')
  const db = getSql()
  const existing = await db<ProgressRow[]>`
    SELECT question_id, status, favorite, updated_at
    FROM user_question_progress
    WHERE user_id = ${userId} AND question_id = ${questionId}
  `
  const status = patch.status ?? (existing[0]?.status as PracticeStatus) ?? 'practiced'
  const favorite = patch.favorite ?? existing[0]?.favorite ?? false

  const rows = await db<ProgressRow[]>`
    INSERT INTO user_question_progress (user_id, question_id, status, favorite, updated_at)
    VALUES (${userId}, ${questionId}, ${status}, ${favorite}, NOW())
    ON CONFLICT (user_id, question_id) DO UPDATE SET
      status = EXCLUDED.status,
      favorite = EXCLUDED.favorite,
      updated_at = NOW()
    RETURNING question_id, status, favorite, updated_at
  `
  return mapRow(rows[0])
}

export async function syncUserProgress(
  userId: string,
  items: QuestionProgress[],
): Promise<QuestionProgress[]> {
  if (!isPgEnabled()) return items
  const server = await listUserProgress(userId)
  const serverMap = new Map(server.map((p) => [p.questionId, p]))
  const merged = new Map<string, QuestionProgress>()

  for (const item of items) {
    const existing = serverMap.get(item.questionId)
    if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
      merged.set(item.questionId, item)
    } else {
      merged.set(item.questionId, existing)
    }
  }
  for (const item of server) {
    if (!merged.has(item.questionId)) merged.set(item.questionId, item)
  }

  const result: QuestionProgress[] = []
  for (const item of merged.values()) {
    result.push(await upsertUserProgress(userId, item.questionId, item))
  }
  return result
}

export async function getUserProgressStats(userId: string) {
  if (!isPgEnabled()) return { practiced: 0, mastered: 0, favorites: 0 }
  const db = getSql()
  const rows = await db<{ practiced: string; mastered: string; favorites: string }[]>`
    SELECT
      COUNT(*) FILTER (WHERE status = 'practiced')::text AS practiced,
      COUNT(*) FILTER (WHERE status = 'mastered')::text AS mastered,
      COUNT(*) FILTER (WHERE favorite = TRUE)::text AS favorites
    FROM user_question_progress
    WHERE user_id = ${userId}
  `
  const row = rows[0]
  return {
    practiced: Number(row?.practiced ?? 0),
    mastered: Number(row?.mastered ?? 0),
    favorites: Number(row?.favorites ?? 0),
  }
}
