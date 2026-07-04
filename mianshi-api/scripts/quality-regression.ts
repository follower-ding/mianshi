import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreByKeyPoints } from '../src/services/scoring.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const goldenPath = join(__dirname, '../data/golden-set.json')

type GoldenCase = {
  id: string
  question: string
  keyPoints: string[]
  answers: Record<string, { text: string; min: number; max: number }>
}

const cases = JSON.parse(readFileSync(goldenPath, 'utf-8')) as GoldenCase[]

let passed = 0
let failed = 0
const failures: string[] = []

for (const item of cases) {
  for (const [level, spec] of Object.entries(item.answers)) {
    const result = scoreByKeyPoints(spec.text, item.keyPoints)
    const ok = result.total >= spec.min && result.total <= spec.max
    const label = `${item.id}/${level}`
    if (ok) {
      passed++
      console.log(`✓ ${label} score=${result.total} (expected ${spec.min}-${spec.max})`)
    } else {
      failed++
      failures.push(`${label}: score=${result.total}, expected ${spec.min}-${spec.max}`)
      console.error(`✗ ${label} score=${result.total} (expected ${spec.min}-${spec.max})`)
    }
  }
}

const total = passed + failed
console.log(`\n--- Quality Regression: ${passed}/${total} passed ---`)

if (failed > 0) {
  console.error('\nFailures:')
  failures.forEach((f) => console.error(`  ${f}`))
  process.exit(1)
}

console.log('All scoring regression tests passed.')
