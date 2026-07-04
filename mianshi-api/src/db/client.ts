import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let sql: ReturnType<typeof postgres> | null = null

export function isPgEnabled() {
  return Boolean(process.env.DATABASE_URL)
}

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  }
  return sql
}

export async function closeDb() {
  if (sql) {
    await sql.end()
    sql = null
  }
}

export async function runMigrations() {
  if (!isPgEnabled()) return
  const db = getSql()
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  await db.unsafe(schema)
}
