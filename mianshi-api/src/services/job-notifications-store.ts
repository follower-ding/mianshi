import { getSql, isPgEnabled } from '../db/client.js'
import { newId } from './store-json.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/db.json')

export type JobNotificationType = 'interview_invited' | 'hr_reply' | 'apply_failed' | 'auto_applied'

export type JobNotification = {
  id: string
  userId: string
  applicationId?: string
  jobId?: string
  type: JobNotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
}

type JsonDb = { jobNotifications?: JobNotification[] }

function loadJsonDb(): JsonDb {
  if (!existsSync(DB_PATH)) return {}
  return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as JsonDb
}

function saveJsonDb(patch: Partial<JsonDb>) {
  const full = existsSync(DB_PATH)
    ? (JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Record<string, unknown>)
    : {}
  writeFileSync(DB_PATH, JSON.stringify({ ...full, ...loadJsonDb(), ...patch }, null, 2), 'utf-8')
}

export async function createJobNotification(input: Omit<JobNotification, 'id' | 'read' | 'createdAt'>) {
  const item: JobNotification = {
    ...input,
    id: newId('ntf'),
    read: false,
    createdAt: new Date().toISOString(),
  }
  if (!isPgEnabled()) {
    saveJsonDb({ jobNotifications: [item, ...(loadJsonDb().jobNotifications ?? [])].slice(0, 200) })
    return item
  }
  const db = getSql()
  await db`
    INSERT INTO job_notifications (id, user_id, application_id, job_id, type, title, body, read, created_at)
    VALUES (${item.id}, ${input.userId}, ${input.applicationId ?? null}, ${input.jobId ?? null},
      ${input.type}, ${input.title}, ${input.body}, false, NOW())
  `
  return item
}

export async function listJobNotifications(userId: string, unreadOnly = false) {
  if (!isPgEnabled()) {
    let items = (loadJsonDb().jobNotifications ?? []).filter((n) => n.userId === userId)
    if (unreadOnly) items = items.filter((n) => !n.read)
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50)
  }
  const db = getSql()
  const rows = unreadOnly
    ? await db`
        SELECT * FROM job_notifications WHERE user_id = ${userId} AND read = false
        ORDER BY created_at DESC LIMIT 50
      `
    : await db`
        SELECT * FROM job_notifications WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 50
      `
  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    applicationId: (r.application_id as string) || undefined,
    jobId: (r.job_id as string) || undefined,
    type: r.type as JobNotificationType,
    title: r.title as string,
    body: r.body as string,
    read: Boolean(r.read),
    createdAt: (r.created_at as Date)?.toISOString?.() ?? '',
  }))
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  if (!isPgEnabled()) {
    const items = loadJsonDb().jobNotifications ?? []
    saveJsonDb({
      jobNotifications: items.map((n) =>
        n.userId === userId && (!ids?.length || ids.includes(n.id)) ? { ...n, read: true } : n,
      ),
    })
    return
  }
  const db = getSql()
  if (ids?.length) {
    for (const id of ids) {
      await db`UPDATE job_notifications SET read = true WHERE id = ${id} AND user_id = ${userId}`
    }
  } else {
    await db`UPDATE job_notifications SET read = true WHERE user_id = ${userId}`
  }
}
