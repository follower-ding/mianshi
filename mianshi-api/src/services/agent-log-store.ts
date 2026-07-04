import { getSql, isPgEnabled } from '../db/client.js'
import type { AgentActionLog, AgentActionType } from '../types/entities.js'
import { newId } from './store-json.js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/db.json')

function loadJson(): { agentLogs?: AgentActionLog[] } {
  if (!existsSync(DB_PATH)) return {}
  return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as { agentLogs?: AgentActionLog[] }
}

function saveJsonLogs(logs: AgentActionLog[]) {
  const full = existsSync(DB_PATH)
    ? (JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Record<string, unknown>)
    : {}
  writeFileSync(DB_PATH, JSON.stringify({ ...full, agentLogs: logs }, null, 2), 'utf-8')
}

function mapRow(r: Record<string, unknown>): AgentActionLog {
  return {
    id: r.id as string,
    userId: (r.user_id as string) ?? (r.userId as string),
    actionType: r.action_type as AgentActionType,
    title: r.title as string,
    body: (r.body as string) ?? '',
    jobId: (r.job_id as string) ?? undefined,
    applicationId: (r.application_id as string) ?? undefined,
    meta: (r.meta as Record<string, unknown>) ?? {},
    createdAt: (r.created_at as Date)?.toISOString?.() ?? (r.createdAt as string),
  }
}

export async function appendAgentLog(input: {
  userId: string
  actionType: AgentActionType
  title: string
  body?: string
  jobId?: string
  applicationId?: string
  meta?: Record<string, unknown>
}): Promise<AgentActionLog> {
  const log: AgentActionLog = {
    id: newId('alog'),
    userId: input.userId,
    actionType: input.actionType,
    title: input.title,
    body: input.body ?? '',
    jobId: input.jobId,
    applicationId: input.applicationId,
    meta: input.meta ?? {},
    createdAt: new Date().toISOString(),
  }

  if (!isPgEnabled()) {
    const logs = loadJson().agentLogs ?? []
    saveJsonLogs([log, ...logs].slice(0, 500))
    return log
  }

  const db = getSql()
  await db`
    INSERT INTO agent_action_logs (id, user_id, action_type, title, body, job_id, application_id, meta, created_at)
    VALUES (
      ${log.id}, ${log.userId}, ${log.actionType}, ${log.title}, ${log.body},
      ${log.jobId ?? null}, ${log.applicationId ?? null}, ${JSON.stringify(log.meta)}, ${log.createdAt}
    )
  `
  return log
}

export async function listAgentLogs(userId: string, limit = 50): Promise<AgentActionLog[]> {
  if (!isPgEnabled()) {
    return (loadJson().agentLogs ?? [])
      .filter((l) => l.userId === userId)
      .slice(0, limit)
  }

  const db = getSql()
  const rows = await db`
    SELECT * FROM agent_action_logs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return rows.map((r) => mapRow(r as Record<string, unknown>))
}
