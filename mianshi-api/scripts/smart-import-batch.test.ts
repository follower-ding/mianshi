import {
  computeImportQuestionWarnings,
  IMPORT_MAX_FILE_BYTES,
  isDuplicateInBatch,
  sliceTextForParse,
  unwrapLlmQuestionList,
  validateImportUpload,
} from '../src/services/smart-import-batch.js'
import { demoParseTextToQuestions } from '../src/services/smart-import-demo.js'
import { titleSimilarity } from '../src/services/question-quality.js'

let failed = false

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed = true
  }
}

const short = sliceTextForParse('a'.repeat(100))
assert(short.truncated === false && short.text.length === 100, 'short text not truncated')

const long = sliceTextForParse('b'.repeat(9000))
assert(long.truncated === true && long.text.length === 8000 && long.originalLength === 9000, 'long text truncated at 8000')

const pdfOk = validateImportUpload('notes.pdf', 1024)
assert(pdfOk.ok === true, 'pdf allowed')

const badExt = validateImportUpload('virus.exe', 100)
assert(badExt.ok === false, 'exe rejected')

const tooBig = validateImportUpload('big.pdf', IMPORT_MAX_FILE_BYTES + 1)
assert(tooBig.ok === false, 'oversized file rejected')

assert(titleSimilarity('JVM 垃圾回收', 'JVM垃圾回收') >= 0.85, 'similar titles detected')

const batch = [{ title: 'Redis 持久化', content: '请说明 RDB 和 AOF 的区别' }]
assert(
  isDuplicateInBatch('Redis持久化机制', '请说明 RDB 和 AOF 的区别', batch),
  'batch duplicate detected',
)
assert(
  isDuplicateInBatch('MySQL 索引', 'B+树索引原理是什么', batch) === false,
  'different question not duplicate in batch',
)

const sample = `1. Java 数组和 ArrayList 的区别？
2. 什么是 JVM 垃圾回收？
请说明 HashMap 的底层原理`
const parsed = demoParseTextToQuestions(sample, 'Java')
assert(parsed.length >= 2, 'demo parser extracts numbered questions')
assert(parsed.some((q) => q.title.includes('数组') || q.content.includes('数组')), 'finds array question')

const wrapped = unwrapLlmQuestionList({ questions: [{ title: 'A', content: 'B?' }] })
assert(wrapped !== null && wrapped.length === 1, 'unwrap questions key')

const arr = unwrapLlmQuestionList([{ title: 'X', content: 'Y?' }])
assert(arr !== null && arr.length === 1, 'unwrap raw array')

const empty = unwrapLlmQuestionList({ foo: 'bar' })
assert(empty === null, 'unwrap unknown shape returns null')

const warn = computeImportQuestionWarnings({ keyPoints: [], referenceAnswer: '' })
assert(warn.length >= 2, 'import warnings for incomplete fields')

if (failed) process.exit(1)
console.log('smart-import-batch: ok')
