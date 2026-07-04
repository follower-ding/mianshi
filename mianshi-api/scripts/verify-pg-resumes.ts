/**
 * PostgreSQL 简历存储冒烟验证
 * 运行: DATABASE_URL=... npm run verify:pg-resumes
 */
import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { getSql, isPgEnabled, runMigrations } from '../src/db/client.js'
import { migrateUserResumesTable } from '../src/services/resume-store.js'

async function main() {
  if (!isPgEnabled()) {
    console.error('FAIL: DATABASE_URL 未配置')
    process.exit(1)
  }

  await runMigrations()
  await migrateUserResumesTable()

  const db = getSql()
  const before = await db<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM user_resumes`
  console.log(`当前简历数: ${before[0]?.count ?? 0}`)

  const users = await db<{ id: string }[]>`SELECT id FROM users LIMIT 1`
  if (users.length === 0) {
    console.log('SKIP: 无用户，跳过 CRUD 冒烟')
    process.exit(0)
  }

  const userId = users[0].id
  const id = randomUUID()
  const title = `verify-${Date.now()}`

  await db`
    INSERT INTO user_resumes (id, user_id, title, template_id, content, raw_text, summary, optimized_text, layout_config)
    VALUES (${id}, ${userId}, ${title}, 'tech-simple', '{}', 'test', '', '', '{}')
  `

  const row = await db`SELECT title FROM user_resumes WHERE id = ${id}`
  if (row[0]?.title !== title) throw new Error('read mismatch')

  await db`UPDATE user_resumes SET title = ${title + '-updated'} WHERE id = ${id}`
  await db`DELETE FROM user_resumes WHERE id = ${id}`

  console.log('verify-pg-resumes: ok (CRUD smoke passed)')
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})
