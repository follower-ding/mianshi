import { z } from 'zod'

export const questionTypes = ['基础', '项目', '系统设计', '算法', '开放'] as const
export const questionStatuses = ['draft', 'review', 'published', 'archived'] as const

const questionBaseSchema = z.object({
  title: z.string().min(2, '标题至少 2 字').max(200),
  category: z.string().min(1).max(50),
  difficulty: z.enum(['简单', '中等', '困难']),
  tags: z.array(z.string()).max(10).default([]),
  content: z.string().min(2, '题干至少 2 字').max(5000),
  position: z.array(z.string()).max(10).optional(),
  type: z.enum(questionTypes).optional(),
  status: z.enum(questionStatuses).optional(),
  referenceAnswer: z.string().max(5000).optional(),
  keyPoints: z.array(z.string()).max(20).optional(),
  scoringRubric: z.string().max(2000).optional(),
  followUpTemplates: z.array(z.string()).max(10).optional(),
})

function refineQuestionByStatus(
  data: z.infer<typeof questionBaseSchema>,
  ctx: z.RefinementCtx,
) {
  const status = data.status ?? 'draft'
  if (status === 'draft' || status === 'archived') return

  if (data.content.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '提交审核/发布时题干至少 10 字',
      path: ['content'],
    })
  }
  if (!data.tags.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '提交审核/发布时请至少填写一个标签',
      path: ['tags'],
    })
  }
  if (status === 'review' || status === 'published') {
    const keyPoints = data.keyPoints ?? []
    if (!keyPoints.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '审核/发布需填写得分要点',
        path: ['keyPoints'],
      })
    } else if (keyPoints.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '得分要点至少 2 条',
        path: ['keyPoints'],
      })
    }
    const referenceAnswer = data.referenceAnswer?.trim() ?? ''
    if (!referenceAnswer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '审核/发布需填写参考答案',
        path: ['referenceAnswer'],
      })
    } else if (referenceAnswer.length < 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '参考答案至少 30 字',
        path: ['referenceAnswer'],
      })
    }
  }
}

export const questionSchema = questionBaseSchema.superRefine(refineQuestionByStatus)

export const questionPatchSchema = questionBaseSchema.partial()

export const experienceSchema = z.object({
  company: z.string().min(1).max(100),
  position: z.string().min(1).max(100),
  result: z.enum(['通过', '待定', '未通过']),
  rounds: z.number().int().min(1).max(20),
  author: z.string().min(1).max(50),
  date: z.string().min(4).max(20),
  summary: z.string().min(10).max(500),
  content: z.string().min(10).max(10000),
})

export const shareReportExperienceSchema = z.object({
  company: z.string().min(1).max(100),
  result: z.enum(['通过', '待定', '未通过']).optional(),
  author: z.string().min(1).max(50).optional(),
  date: z.string().min(4).max(20).optional(),
  summary: z.string().min(10).max(500).optional(),
  content: z.string().min(10).max(10000).optional(),
})

export const experiencePatchSchema = experienceSchema.partial()

export const interviewStartSchema = z.object({
  position: z.string().min(1),
  experience: z.string().default('未指定'),
  mode: z.enum(['quick', 'standard', 'deep']).default('standard'),
  questionId: z.string().min(1).optional(),
  applicationId: z.string().min(1).optional(),
})

export const interviewModes = {
  quick: { rounds: 2, label: '快速 5min' },
  standard: { rounds: 4, label: '标准 15min' },
  deep: { rounds: 6, label: '深度 30min' },
} as const

export const interviewChatSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(5000),
  history: z.array(
    z.object({
      role: z.enum(['interviewer', 'candidate']),
      content: z.string(),
    }),
  ),
})

export const interviewAssistSchema = z.object({
  sessionId: z.string().min(1),
  question: z.string().min(1).max(5000),
  variant: z.number().int().min(0).max(20).optional(),
})

const optionalBossCookie = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return val
    const trimmed = val.trim()
    return trimmed.length >= 10 ? trimmed : undefined
  },
  z.string().min(10).max(20000).optional(),
)

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(50),
  bossCookie: optionalBossCookie,
  bossConnectId: z.string().min(1).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100),
  bossCookie: optionalBossCookie,
  bossConnectId: z.string().min(1).optional(),
})

export const jobPostingSchema = z.object({
  company: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  position: z.string().min(1).max(100),
  city: z.string().max(50).default(''),
  salary: z.string().max(50).default('面议'),
  experience: z.string().max(50).default('不限'),
  education: z.string().max(50).default('本科'),
  jd: z.string().min(10).max(5000),
  tags: z.array(z.string()).min(1).max(10),
  status: z.enum(['draft', 'published', 'closed']).optional(),
})

export const jobApplySchema = z.object({
  jobId: z.string().min(1),
  greeting: z.string().min(10).max(2000).optional(),
  resumeSummary: z.string().max(1000).optional(),
})

export const jobGreetingPreviewSchema = z.object({
  jobId: z.string().min(1),
  resumeSummary: z.string().max(1000).optional(),
})

export const jobApplicationPatchSchema = z.object({
  status: z.enum(['applied', 'viewed', 'interview_invited', 'interview_done', 'rejected', 'offer']).optional(),
  greeting: z.string().min(10).max(2000).optional(),
})

export const jobPreferenceSchema = z.object({
  targetCompanies: z.array(z.string()).max(20).default([]),
  targetCities: z.array(z.string()).max(10).default([]),
  targetPositions: z.array(z.string()).max(10).default([]),
  salaryMin: z.number().int().min(0).max(500).optional(),
  salaryMax: z.number().int().min(0).max(500).optional(),
  excludeKeywords: z.array(z.string()).max(20).default([]),
  dailyApplyLimit: z.number().int().min(1).max(30).default(8),
  autoApplyMode: z.enum(['off', 'review', 'auto']).default('review'),
  maxJobsAutoCrawl: z.number().int().min(5).max(50).default(20),
  maxJobsManualCrawl: z.number().int().min(5).max(80).default(30),
  maxManualCrawlsPerDay: z.number().int().min(1).max(10).default(3),
  dailyRecommendLimit: z.number().int().min(3).max(15).default(8),
  manualCrawlPositions: z.array(z.string()).max(10).default([]),
  manualCrawlCities: z.array(z.string()).max(10).default([]),
  manualCrawlSalaryMin: z.number().int().min(0).max(500).optional(),
  manualCrawlSalaryMax: z.number().int().min(0).max(500).optional(),
  resumeSummary: z.string().max(2000).optional(),
})

export const bossSessionSchema = z.object({
  cookie: z.string().min(10).max(20000),
})

export const bossBindSchema = z.object({
  cookie: z.string().min(10).max(20000),
})

export const resumeParseTextSchema = z.object({
  text: z.string().min(30).max(50000),
  resumeId: z.string().min(1).optional(),
})

export const resumeCreateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  templateId: z.string().min(1).max(50).optional(),
})

export const resumeOptimizeSchema = z.object({
  text: z.string().min(30).max(50000).optional(),
  content: z.record(z.unknown()).optional(),
  jobId: z.string().min(1).optional(),
  resumeId: z.string().min(1).optional(),
})

export const resumeGenerateSchema = z.object({
  targetJob: z.string().min(2).max(100),
  personalInfo: z.string().min(10).max(5000),
})

export const resumeUpsertSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  templateId: z.string().min(1).max(50).optional(),
  content: z.record(z.unknown()).optional(),
  rawText: z.string().max(50000).optional(),
  summary: z.string().max(2000).optional(),
  optimizedText: z.string().max(50000).optional(),
  layoutConfig: z
    .object({
      sectionOrder: z.array(z.string()).optional(),
      sectionVisibility: z.record(z.boolean()).optional(),
      previewSettings: z.record(z.unknown()).optional(),
    })
    .optional(),
})
