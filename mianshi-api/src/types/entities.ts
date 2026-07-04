export type QuestionType = '基础' | '项目' | '系统设计' | '算法' | '开放'
export type QuestionStatus = 'draft' | 'review' | 'published' | 'archived'
export type UserRole = 'user' | 'admin'
export type CandidateQuestionStatus = 'draft' | 'review' | 'published' | 'rejected'

export type Question = {
  id: string
  title: string
  category: string
  difficulty: string
  tags: string[]
  content: string
  views: number
  createdAt: string
  position?: string[]
  type?: QuestionType
  status?: QuestionStatus
  referenceAnswer?: string
  keyPoints?: string[]
  scoringRubric?: string
  followUpTemplates?: string[]
  sourceExperienceId?: string
  userId?: string
}

export type RoundRecord = {
  topic: string
  question: string
  answer: string
  score: number
  feedback: string
  questionId?: string
  dimensions?: {
    accuracy: number
    depth: number
    structure: number
    practice: number
  }
}

export type QuestionPlanItem = {
  questionId: string
  title: string
  content: string
  keyPoints: string[]
  scoringRubric: string
  referenceAnswer: string
  difficulty: string
  type: string
  followUpTemplates: string[]
  category: string
}

export type InterviewSession = {
  id: string
  userId?: string
  position: string
  experience: string
  questionIndex: number
  totalScore: number
  answerCount: number
  followUpActive?: boolean
  createdAt: number
  questionPlan: QuestionPlanItem[]
  rounds: RoundRecord[]
  pinnedQuestionId?: string
  applicationId?: string
  companyName?: string
}

export type Experience = {
  id: string
  company: string
  position: string
  result: string
  rounds: number
  author: string
  date: string
  summary: string
  content: string
  createdAt: string
  userId?: string
  status?: ExperienceStatus
  /** 由模拟面试报告分享生成 */
  sourceReportId?: string
  sourceType?: 'simulation' | 'real'
}

export type ExperienceStatus = 'pending' | 'published' | 'rejected'

export type TranscriptItem = {
  role: 'interviewer' | 'candidate'
  content: string
}

export type ReportRound = RoundRecord

export type InterviewReport = {
  id: string
  sessionId: string
  userId?: string
  position: string
  experience: string
  totalScore: number
  answerCount: number
  summary: string
  strengths: string[]
  improvements: string[]
  overallRating: string
  nextSteps: string[]
  scoreBreakdown: { topic: string; score: number; comment: string }[]
  transcript: TranscriptItem[]
  rounds: ReportRound[]
  sourceQuestionId?: string
  sourceCategory?: string
  applicationId?: string
  createdAt: string
}

export type User = {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

export type CandidateQuestion = {
  id: string
  experienceId: string
  title: string
  category: string
  difficulty: string
  tags: string[]
  content: string
  type: QuestionType
  referenceAnswer: string
  keyPoints: string[]
  scoringRubric: string
  followUpTemplates: string[]
  status: CandidateQuestionStatus
  createdAt: string
}

export type AuthUser = Pick<User, 'id' | 'email' | 'name' | 'role'>

export type JobPostingStatus = 'draft' | 'published' | 'closed'

export type JobSource = 'internal' | 'boss'

export type JobMatchTier = 'S' | 'A' | 'B' | 'C'

export type JobMatchStatus = 'pending_review' | 'queued' | 'applied' | 'skipped'

export type AutoApplyMode = 'off' | 'review' | 'auto'

export type CrawlTrigger = 'manual' | 'scheduled' | 'agent'

export type JobApplicationStatus =
  | 'applied'
  | 'viewed'
  | 'interview_invited'
  | 'interview_done'
  | 'rejected'
  | 'offer'

export type JobPosting = {
  id: string
  company: string
  title: string
  position: string
  city: string
  salary: string
  experience: string
  education: string
  jd: string
  tags: string[]
  status: JobPostingStatus
  createdAt: string
  source?: JobSource
  externalId?: string
  externalUrl?: string
  crawledAt?: string
  bossMeta?: Record<string, string>
}

export type JobPreference = {
  userId: string
  targetCompanies: string[]
  targetCities: string[]
  targetPositions: string[]
  salaryMin?: number
  salaryMax?: number
  excludeKeywords: string[]
  dailyApplyLimit: number
  autoApplyMode: AutoApplyMode
  /** 定时/Agent 自动抓取最多入库岗位数 */
  maxJobsAutoCrawl: number
  /** 手动点击「抓取 Boss」最多入库岗位数 */
  maxJobsManualCrawl: number
  /** 每日手动抓取次数上限 */
  maxManualCrawlsPerDay: number
  /** 今日推荐固定展示条数（S/A 匹配） */
  dailyRecommendLimit: number
  /** 手动抓取专用条件（与定时抓取画像分离） */
  manualCrawlPositions: string[]
  manualCrawlCities: string[]
  manualCrawlSalaryMin?: number
  manualCrawlSalaryMax?: number
  resumeSummary?: string
  lastCrawlAt?: string
  updatedAt: string
}

export type JobMatch = {
  id: string
  userId: string
  jobId: string
  score: number
  tier: JobMatchTier
  reasons: string[]
  status: JobMatchStatus
  suggestedGreeting?: string
  matchedAt: string
  job?: JobPosting
}

export type CrawlRun = {
  id: string
  userId: string
  source: JobSource
  trigger: CrawlTrigger
  query: string
  jobsFound: number
  jobsNew: number
  status: 'running' | 'success' | 'failed'
  error?: string
  startedAt: string
  finishedAt?: string
}

export type AgentActionType =
  | 'crawl_start'
  | 'crawl_done'
  | 'match_found'
  | 'auto_apply'
  | 'apply_failed'
  | 'hr_reply'
  | 'ai_reply'
  | 'interview_detected'

export type AgentActionLog = {
  id: string
  userId: string
  actionType: AgentActionType
  title: string
  body: string
  jobId?: string
  applicationId?: string
  meta?: Record<string, unknown>
  createdAt: string
}

export type BossChatMessage = {
  id: string
  userId: string
  bossJobId: string
  company: string
  jobTitle: string
  role: 'hr' | 'user' | 'ai'
  content: string
  intent?: string
  aiSuggested?: boolean
  sentAt: string
}

export type BossApplyStatus = 'pending' | 'sending' | 'sent' | 'failed'

export type JobApplication = {
  id: string
  userId: string
  jobId: string
  status: JobApplicationStatus
  greeting: string
  resumeSummary?: string
  sessionId?: string
  reportId?: string
  appliedAt: string
  updatedAt: string
  bossApplyStatus?: BossApplyStatus
  bossApplyError?: string
  bossReplySnippet?: string
  bossSyncedAt?: string
  /** 投递时快照，便于列表展示 */
  job?: Pick<
    JobPosting,
    'company' | 'title' | 'position' | 'city' | 'salary' | 'externalUrl' | 'source'
  > & {
    externalId?: string
    jd?: string
  }
}

export type ResumeBasicFieldVisibility = {
  avatar?: boolean
  title?: boolean
  phone?: boolean
  email?: boolean
  city?: boolean
}

export type ResumeBasic = {
  name?: string
  phone?: string
  email?: string
  city?: string
  title?: string
  /** data URL 或 HTTPS 头像地址 */
  avatarUrl?: string
  avatarShape?: 'circle' | 'square' | 'rounded'
  fieldVisibility?: ResumeBasicFieldVisibility
}

export type ResumeHonor = {
  title: string
  date?: string
  desc?: string
}

export type ResumeCertificate = {
  name: string
  issuer?: string
  date?: string
}

export type ResumeCustomSection = {
  id: string
  title: string
  body?: string
}

export type ResumeEducation = {
  school: string
  major?: string
  degree?: string
  start?: string
  end?: string
}

export type ResumeExperience = {
  company: string
  title: string
  department?: string
  city?: string
  start?: string
  end?: string
  highlights: string[]
  /** 工作内容 — 富文本 HTML */
  detail?: string
}

export type ResumeProject = {
  name: string
  role?: string
  desc?: string
  techStack?: string[]
  highlights: string[]
}

export type ResumeContent = {
  basic?: ResumeBasic
  education?: ResumeEducation[]
  experience?: ResumeExperience[]
  projects?: ResumeProject[]
  skills?: string[]
  selfIntro?: string
  honors?: ResumeHonor[]
  certificates?: ResumeCertificate[]
  customSections?: ResumeCustomSection[]
}

/** 每份简历独立的排版/预览配置 */
export type ResumeLayoutConfig = {
  sectionOrder?: string[]
  sectionVisibility?: Record<string, boolean>
  previewSettings?: Record<string, unknown>
}

export type ResumeOptimizeChange = {
  section: string
  before: string
  after: string
}

export type ResumeOptimizeResult = {
  content: ResumeContent
  optimizedText: string
  summary: string
  suggestions: string[]
  changes: ResumeOptimizeChange[]
  source?: 'llm' | 'demo'
}

export type ResumeGenerateResult = {
  content: ResumeContent
  title: string
  summary: string
  rawText: string
  /** llm=大模型生成；demo=密钥未配置或调用失败时的规则模板 */
  source: 'llm' | 'demo'
}

import type { ResumeFieldCoverageItem } from '../services/resume-field-coverage.js'

export type ResumeParseResult = {
  content: ResumeContent
  /** llm=大模型解析；demo=密钥未配置或调用失败时的规则模板 */
  source: 'llm' | 'demo'
  fieldCoverage?: ResumeFieldCoverageItem[]
}

export type ResumeExtractResult = {
  text: string
  fileName?: string
  charCount: number
}

export type UserResume = {
  id: string
  userId: string
  title: string
  templateId: string
  content: ResumeContent
  rawText: string
  summary: string
  optimizedText: string
  layoutConfig?: ResumeLayoutConfig
  updatedAt: string
}
