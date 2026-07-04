/**
 * 将 data/db.json 中的 userResumes 迁移到 PostgreSQL
 * 运行: DATABASE_URL=... npm run migrate:json-resumes
 */
import 'dotenv/config'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSql, isPgEnabled, runMigrations } from '../src/db/client.js'
import { migrateUserResumesTable } from '../src/services/resume-store.js'
import { migrateResumeSharesTable } from '../src/services/resume-share-store.js'
import type { UserResume } from '../src/types/entities.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../data/db.json')

async function main() {
  if (!isPgEnabled()) {
    console.error('需要配置 DATABASE_URL')
    process.exit(1)
  }
  if (!existsSync(DB_PATH)) {
    console.error('db.json 不存在，无需迁移')
    process.exit(0)
  }

  await runMigrations()
  await migrateUserResumesTable()
  await migrateResumeSharesTable()

  const raw = JSON.parse(readFileSync(DB_PATH, 'utf-8')) as { userResumes?: UserResume[] }
  const resumes = raw.userResumes ?? []
  if (resumes.length === 0) {
    console.log('db.json 中无 userResumes，跳过')
    return
  }

  const db = getSql()
  let inserted = 0
  let skipped = 0

  for (const r of resumes) {
    const id = r.id || r.userId
    const rows = await db`SELECT id FROM user_resumes WHERE id = ${id}`
    if (rows.length > 0) {
      skipped++
      continue
    }
    await db`
      INSERT INTO user_resumes (
        id, user_id, title, template_id, content, raw_text, summary, optimized_text, layout_config, updated_at
      ) VALUES (
        ${id},
        ${r.userId},
        ${r.title || '我的简历'},
        ${r.templateId || 'tech-simple'},
        ${JSON.parse(JSON.stringify(r.content ?? {}))},
        ${r.rawText ?? ''},
        ${r.summary ?? ''},
        ${r.optimizedText ?? ''},
        ${JSON.parse(JSON.stringify(r.layoutConfig ?? {}))},
        ${r.updatedAt ?? new Date().toISOString()}
      )
    `
    inserted++
  }

  const shares = (raw as { resumeShares?: unknown[] }).resumeShares ?? []
  let shareInserted = 0
  for (const s of shares as Array<Record<string, unknown>>) {
    const token = s.token as string
    const exists = await db`SELECT token FROM resume_shares WHERE token = ${token}`
    if (exists.length > 0) continue
    await db`
      INSERT INTO resume_shares (
        token, user_id, resume_id, title, template_id, content, layout_config, created_at
      ) VALUES (
        ${token},
        ${s.userId as string},
        ${s.resumeId as string},
        ${(s.title as string) || '我的简历'},
        ${(s.templateId as string) || 'tech-simple'},
        ${JSON.parse(JSON.stringify(s.content ?? {}))},
        ${JSON.parse(JSON.stringify(s.layoutConfig ?? {}))},
        ${(s.createdAt as string) ?? new Date().toISOString()}
      )
    `
    shareInserted++
  }

  const pgCount = await db<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM user_resumes`
  console.log(`迁移完成: 简历插入 ${inserted}，跳过 ${skipped}，分享 ${shareInserted}`)
  console.log(`PG user_resumes 总数: ${pgCount[0]?.count ?? 0}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
