/**
 * Fail CI if the main entry chunk exceeds budget after gzip-unaware raw size check.
 * Usage: node scripts/check-bundle-size.mjs [distDir]
 */
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const distDir = process.argv[2] ?? join(process.cwd(), 'dist', 'assets')
const MAX_ENTRY_KB = 350
const MAX_ANY_CHUNK_KB = 600

let files
try {
  files = readdirSync(distDir).filter((f) => f.endsWith('.js'))
} catch {
  console.error(`check-bundle-size: cannot read ${distDir} — run npm run build first`)
  process.exit(1)
}

if (files.length === 0) {
  console.error('check-bundle-size: no JS assets found')
  process.exit(1)
}

const sizes = files.map((f) => {
  const path = join(distDir, f)
  const kb = Math.round(statSync(path).size / 1024)
  return { file: f, kb }
})

sizes.sort((a, b) => b.kb - a.kb)

let failed = false
const entry = sizes.find((s) => /^index-/.test(s.file)) ?? sizes[0]

console.log('Bundle chunks (top):')
for (const s of sizes.slice(0, 12)) {
  console.log(`  ${s.kb} KB  ${s.file}`)
}

if (entry.kb > MAX_ENTRY_KB) {
  console.error(`\ncheck-bundle-size: entry ${entry.file} is ${entry.kb} KB (max ${MAX_ENTRY_KB} KB)`)
  failed = true
}

for (const s of sizes) {
  if (s.kb > MAX_ANY_CHUNK_KB) {
    console.error(`check-bundle-size: ${s.file} is ${s.kb} KB (max ${MAX_ANY_CHUNK_KB} KB)`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log(`\ncheck-bundle-size: ok (entry ${entry.kb} KB)`)
