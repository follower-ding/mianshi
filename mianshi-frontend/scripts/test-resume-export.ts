/**
 * 简历导出工具回归 — stripModernColorFunctions
 * 运行: npx tsx scripts/test-resume-export.ts
 */
import { MODERN_CSS_COLOR_RE, stripModernColorFunctions } from '../src/components/resume/resumeExport.ts'

let passed = 0
let failed = 0

function assert(label: string, ok: boolean) {
  if (ok) {
    passed++
    console.log(`✓ ${label}`)
  } else {
    failed++
    console.error(`✗ ${label}`)
  }
}

const sample = `
.bg-brand { background: oklab(0.7 0.05 -0.1); }
.text { color: oklch(65% 0.15 180); }
`

const stripped = stripModernColorFunctions(sample)
assert('strips oklab', !stripped.includes('oklab('))
assert('strips oklch', !stripped.includes('oklch('))
assert('replaces with hex', stripped.includes('#888888'))

assert('regex matches oklab', MODERN_CSS_COLOR_RE.test('oklab(0.5 0.1 0.2)'))
MODERN_CSS_COLOR_RE.lastIndex = 0

console.log(`\n--- Resume Export Unit: ${passed}/${passed + failed} passed ---`)
if (failed > 0) process.exit(1)
