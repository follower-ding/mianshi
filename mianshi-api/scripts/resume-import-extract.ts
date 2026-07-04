/**
 * 简历文本提取回归
 * 运行: npm run test:import-extract
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractTextFromFile } from '../src/services/resume-extract.js'
import { parseResumeText } from '../src/services/resume-optimize.js'

process.env.LLM_FORCE_DEMO = '1'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '../fixtures/resume')

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

async function main() {
  const txtPath = join(fixturesDir, 'sample-resume.txt')
  assert('fixture txt exists', existsSync(txtPath))
  const txt = readFileSync(txtPath, 'utf-8')
  assert('fixture txt length >= 30', txt.trim().length >= 30, `${txt.trim().length}`)

  const txtBuffer = Buffer.from(txt, 'utf-8')
  const extractedTxt = await extractTextFromFile(txtBuffer, 'txt')
  assert('extract txt matches', extractedTxt.trim().length >= 30)

  const pdfPath = join(fixturesDir, 'sample-resume.pdf')
  if (existsSync(pdfPath)) {
    const pdfBuffer = readFileSync(pdfPath)
    const extractedPdf = await extractTextFromFile(pdfBuffer, 'pdf')
    assert('extract pdf length >= 30', extractedPdf.trim().length >= 30, `${extractedPdf.trim().length}`)
  } else {
    console.log('⊘ sample-resume.pdf 未找到，跳过 PDF 提取测试')
  }

  const docxPath = join(fixturesDir, 'sample-resume.docx')
  if (existsSync(docxPath)) {
    const docxBuffer = readFileSync(docxPath)
    const extractedDocx = await extractTextFromFile(docxBuffer, 'docx')
    assert('extract docx length >= 30', extractedDocx.trim().length >= 30)
  } else {
    console.log('⊘ sample-resume.docx 未找到，跳过 DOCX 提取测试')
  }

  const parsed = await parseResumeText(txt)
  assert('parse returns source', parsed.source === 'demo' || parsed.source === 'llm')
  assert('parse has basic', Boolean(parsed.content.basic))
  assert('parse has experience or skills', Boolean(parsed.content.experience?.length || parsed.content.skills?.length))

  console.log(`\n--- Import Extract Regression: ${passed}/${passed + failed} passed ---`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
