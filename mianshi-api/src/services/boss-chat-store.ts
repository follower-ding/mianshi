import { getSql, isPgEnabled } from '../db/client.js'
import type { BossChatMessage } from '../types/entities.js'
import { newId } from './store-json.js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/db.json')

function loadJson(): { bossChatMessages?: BossChatMessage[] } {
  if (!existsSync(DB_PATH)) return {}
  return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as { bossChatMessages?: BossChatMessage[] }
}

function saveJsonMessages(msgs: BossChatMessage[]) {
  const full = existsSync(DB_PATH)
    ? (JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Record<string, unknown>)
    : {}
  writeFileSync(DB_PATH, JSON.stringify({ ...full, bossChatMessages: msgs }, null, 2), 'utf-8')
}

function mapRow(r: Record<string, unknown>): BossChatMessage {
  return {
    id: r.id as string,
    userId: (r.user_id as string) ?? (r.userId as string),
    bossJobId: (r.boss_job_id as string) ?? (r.bossJobId as string),
    company: (r.company as string) ?? '',
    jobTitle: (r.job_title as string) ?? (r.jobTitle as string) ?? '',
    role: r.role as BossChatMessage['role'],
    content: r.content as string,
    intent: (r.intent as string) ?? undefined,
    aiSuggested: Boolean(r.ai_suggested ?? r.aiSuggested),
    sentAt: (r.sent_at as Date)?.toISOString?.() ?? (r.sentAt as string),
  }
}

export async function saveBossChatMessage(input: Omit<BossChatMessage, 'id' | 'sentAt'> & { id?: string }) {
  const msg: BossChatMessage = {
    id: input.id ?? newId('bmsg'),
    userId: input.userId,
    bossJobId: input.bossJobId,
    company: input.company,
    jobTitle: input.jobTitle,
    role: input.role,
    content: input.content,
    intent: input.intent,
    aiSuggested: input.aiSuggested ?? false,
    sentAt: new Date().toISOString(),
  }

  if (!isPgEnabled()) {
    const msgs = loadJson().bossChatMessages ?? []
    saveJsonMessages([...msgs, msg].slice(-2000))
    return msg
  }

  const db = getSql()
  await db`
    INSERT INTO boss_chat_messages (id, user_id, boss_job_id, company, job_title, role, content, intent, ai_suggested, sent_at)
    VALUES (
      ${msg.id}, ${msg.userId}, ${msg.bossJobId}, ${msg.company}, ${msg.jobTitle},
      ${msg.role}, ${msg.content}, ${msg.intent ?? null}, ${msg.aiSuggested === true}, ${msg.sentAt}
    )
  `
  return msg
}

export async function listBossChatMessages(
  userId: string,
  bossJobId: string,
  limit = 100,
): Promise<BossChatMessage[]> {
  if (!isPgEnabled()) {
    return (loadJson().bossChatMessages ?? [])
      .filter((m) => m.userId === userId && m.bossJobId === bossJobId)
      .slice(-limit)
  }

  const db = getSql()
  const rows = await db`
    SELECT * FROM boss_chat_messages
    WHERE user_id = ${userId} AND boss_job_id = ${bossJobId}
    ORDER BY sent_at ASC
    LIMIT ${limit}
  `
  return rows.map((r) => mapRow(r as Record<string, unknown>))
}

/** 本地已保存的会话摘要（Boss API 失败时的回退） */
export async function listBossChatThreads(userId: string): Promise<
  Array<{
    bossJobId: string
    company: string
    jobTitle: string
    lastMessage: string
    updatedAt: string
  }>
> {
  if (!isPgEnabled()) {
    const msgs = (loadJson().bossChatMessages ?? []).filter((m) => m.userId === userId)
    const map = new Map<string, (typeof msgs)[0]>()
    for (const m of msgs) {
      const prev = map.get(m.bossJobId)
      if (!prev || m.sentAt > prev.sentAt) map.set(m.bossJobId, m)
    }
    return [...map.values()].map((m) => ({
      bossJobId: m.bossJobId,
      company: m.company,
      jobTitle: m.jobTitle,
      lastMessage: m.content,
      updatedAt: m.sentAt,
    }))
  }

  const db = getSql()
  const rows = await db`
    SELECT DISTINCT ON (boss_job_id)
      boss_job_id, company, job_title, content, sent_at
    FROM boss_chat_messages
    WHERE user_id = ${userId}
    ORDER BY boss_job_id, sent_at DESC
  `
  return rows.map((r) => ({
    bossJobId: r.boss_job_id as string,
    company: (r.company as string) ?? '',
    jobTitle: (r.job_title as string) ?? '',
    lastMessage: (r.content as string) ?? '',
    updatedAt: (r.sent_at as Date)?.toISOString?.() ?? '',
  }))
}
