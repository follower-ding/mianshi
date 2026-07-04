import { computeResumeFieldCoverage } from '../src/services/resume-field-coverage.js'
import type { ResumeContent } from '../src/types/entities.js'

let failed = false

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed = true
  }
}

const demoContent: ResumeContent = {
  basic: { name: '候选人', title: '软件工程师' },
  selfIntro: '简短介绍',
  experience: [
    { company: '某科技公司', title: '开发', highlights: ['做后端'], start: '2021', end: '至今' },
  ],
  skills: ['Java'],
}

const demoCov = computeResumeFieldCoverage(demoContent, 'demo')
assert(demoCov.some((i) => i.key === 'education' && i.status === 'missing'), 'demo missing education')
assert(demoCov.some((i) => i.key === 'basic.name' && i.status === 'low'), 'demo low name')
assert(demoCov.some((i) => i.key === 'experience' && i.status === 'low'), 'demo low company')

const fullContent: ResumeContent = {
  basic: { name: '张三', title: 'Java 后端', phone: '13800000000', email: 'a@b.com', city: '北京' },
  selfIntro:
    '五年 Java 后端开发经验，熟悉微服务架构、高并发系统设计与性能调优，曾主导订单核心链路重构并稳定支撑大促流量。',
  education: [{ school: '北京大学', major: '计算机', degree: '本科', start: '2015', end: '2019' }],
  experience: [
    {
      company: '字节跳动',
      title: '高级开发',
      highlights: ['优化 GC'],
      start: '2019',
      end: '至今',
    },
  ],
  projects: [{ name: '订单系统', highlights: ['QPS 10w'] }],
  skills: ['Java', 'Spring', 'MySQL', 'Redis', 'Kafka'],
}

const fullCov = computeResumeFieldCoverage(fullContent, 'llm')
assert(fullCov.every((i) => i.status === 'ok'), 'complete resume all ok')

if (failed) process.exit(1)
console.log('resume-field-coverage: ok')
