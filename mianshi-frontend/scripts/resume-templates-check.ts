/**
 * 模板数量回归 — Phase 3 要求 8 套
 */
import { RESUME_TEMPLATES } from '../src/lib/data'
import { isValidTemplateId } from '../src/components/resume/resumeUtils'

let failed = false

if (RESUME_TEMPLATES.length !== 8) {
  console.error(`Expected 8 templates, got ${RESUME_TEMPLATES.length}`)
  failed = true
}

for (const tpl of RESUME_TEMPLATES) {
  if (!isValidTemplateId(tpl.id)) {
    console.error(`Invalid template id: ${tpl.id}`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log('resume-templates: ok (8 templates)')
