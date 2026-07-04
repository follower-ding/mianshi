import { validateResumeUpload, RESUME_MAX_FILE_BYTES } from '../src/services/resume-file-guard.js'

let failed = false

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed = true
  }
}

const pdfOk = validateResumeUpload('test.pdf', Buffer.from('%PDF-1.4 hello world'))
assert(pdfOk.ok === true, 'valid pdf')

const pdfBad = validateResumeUpload('test.pdf', Buffer.from('NOTPDF'))
assert(pdfBad.ok === false, 'invalid pdf magic')

const big = Buffer.alloc(RESUME_MAX_FILE_BYTES + 1)
const tooBig = validateResumeUpload('big.pdf', big)
assert(tooBig.ok === false && tooBig.status === 413, 'file too large')

const docxOk = validateResumeUpload('x.docx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]))
assert(docxOk.ok === true, 'valid docx zip header')

if (failed) process.exit(1)
console.log('resume-file-guard: ok')
