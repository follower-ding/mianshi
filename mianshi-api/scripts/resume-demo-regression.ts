/**
 * 简历 AI 演示模式回归 — 验证目标岗位与生成结果一致
 * 运行: npm run test:resume-demo
 */
import { generateResume, skillsForTargetJob } from '../src/services/resume-optimize.js'

process.env.LLM_FORCE_DEMO = '1'

const PERSONAL =
  '我2020年本科毕业于东华大学，有字节跳动、腾讯等大厂实习经历，自己开发过校园社交微信小程序'

let passed = 0
let failed = 0

function assert(label: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++
    console.log(`✓ ${label}`)
  } else {
    failed++
    console.error(`✗ ${label}${detail ? `: ${detail}` : ''}`)
  }
}

async function testGenerate(targetJob: string) {
  const r = await generateResume({ targetJob, personalInfo: PERSONAL })
  assert(`${targetJob} → title`, r.title === `${targetJob}-AI`, `got ${r.title}`)
  assert(`${targetJob} → basic.title`, r.content.basic?.title === targetJob, `got ${r.content.basic?.title}`)
  assert(`${targetJob} → source demo`, r.source === 'demo')
  assert(
    `${targetJob} → skills not all Java`,
    targetJob.includes('AI')
      ? !r.content.skills?.every((s) => /java|spring/i.test(s))
      : true,
    r.content.skills?.join(', '),
  )
}

async function main() {
  const aiSkills = skillsForTargetJob('AI 开发工程师')
  assert('AI skills include Python', aiSkills.some((s) => /python|llm|pytorch/i.test(s)))
  assert('AI skills exclude Spring Boot default', !aiSkills.includes('Spring Boot'))

  const javaSkills = skillsForTargetJob('Java 后端开发')
  assert('Java skills include Spring', javaSkills.some((s) => /spring|java/i.test(s)))

  await testGenerate('AI 开发工程师')
  await testGenerate('Java 后端开发')

  console.log(`\n--- Resume Demo Regression: ${passed}/${passed + failed} passed ---`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
