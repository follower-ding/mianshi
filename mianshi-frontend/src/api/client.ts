export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

let authToken: string | null = localStorage.getItem('mianshi_token')

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem('mianshi_token', token)
  else localStorage.removeItem('mianshi_token')
}

export function getAuthToken() {
  return authToken
}

const REQUEST_TIMEOUT_MS = 30_000
const RESUME_AI_TIMEOUT_MS = 90_000
const RESUME_UPLOAD_TIMEOUT_MS = 120_000
export const RESUME_UPLOAD_MAX_BYTES = 10 * 1024 * 1024

export const SCANNED_PDF_CODE = 'SCANNED_PDF_NEED_OCR'

export class ApiError extends Error {
  code?: string
  status?: number
  duplicateId?: string
  extractedText?: string
  expiresAt?: string | null
  issues?: { path: string; message: string }[]

  constructor(
    message: string,
    opts?: {
      code?: string
      status?: number
      duplicateId?: string
      extractedText?: string
      expiresAt?: string | null
      issues?: { path: string; message: string }[]
    },
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = opts?.code
    this.status = opts?.status
    this.duplicateId = opts?.duplicateId
    this.extractedText = opts?.extractedText
    this.expiresAt = opts?.expiresAt
    this.issues = opts?.issues
  }
}

export class ImportUploadError extends ApiError {
  constructor(message: string, extractedText?: string, code?: string) {
    super(message, { extractedText, code })
    this.name = 'ImportUploadError'
  }
}

function friendlyApiError(message: string): string {
  if (/api key|Authentication Fails|invalid.*key|401/i.test(message)) {
    return 'AI 服务密钥无效或未配置。请在 mianshi-api/.env 更新 LLM_API_KEY 并重启 API；当前应已自动使用演示模式，若仍报错请刷新后重试'
  }
  return message
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const abort = new AbortController()
  const timeoutId = setTimeout(() => abort.abort(), timeoutMs)

  const signal = init?.signal ?? abort.signal

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
      ...init,
      signal,
    })
    if (res.status === 401) {
      setAuthToken(null)
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      const body = err as {
        error?: string
        code?: string
        duplicateId?: string
        expiresAt?: string | null
        issues?: { path?: string; message: string }[]
      }
      const issueMessages = body.issues?.map((i) => i.message).filter(Boolean)
      const message =
        issueMessages?.length
          ? issueMessages.join('；')
          : friendlyApiError(body.error ?? 'Request failed')
      throw new ApiError(message, {
        code: body.code,
        status: res.status,
        duplicateId: body.duplicateId,
        expiresAt: body.expiresAt,
        issues: body.issues?.map((i) => ({
          path: i.path ?? '',
          message: i.message,
        })),
      })
    }
    return res.json() as Promise<T>
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试或缩短内容后重试')
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchMultipart<T>(
  path: string,
  fd: FormData,
  timeoutMs = RESUME_UPLOAD_TIMEOUT_MS,
): Promise<T> {
  const abort = new AbortController()
  const timeoutId = setTimeout(() => abort.abort(), timeoutMs)
  try {
    const headers: Record<string, string> = {}
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: fd,
      signal: abort.signal,
    })
    const data = (await res.json()) as T & { error?: string; code?: string }
    if (!res.ok) {
      throw new ApiError(friendlyApiError(data.error ?? '请求失败'), {
        code: data.code,
        status: res.status,
      })
    }
    return data
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('上传超时，请检查网络或尝试较小文件')
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

export type AuthUser = {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
}

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
  type?: string
  status?: string
  referenceAnswer?: string
  keyPoints?: string[]
  scoringRubric?: string
  followUpTemplates?: string[]
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
  status?: 'pending' | 'published' | 'rejected'
  sourceReportId?: string
  sourceType?: 'simulation' | 'real'
}

export type ReportExperienceDraft = {
  company: string
  position: string
  result: '通过' | '待定' | '未通过'
  rounds: number
  author: string
  date: string
  summary: string
  content: string
  sourceType: 'simulation'
}

export type JobPostingStatus = 'draft' | 'published' | 'closed'

export type JobSource = 'internal' | 'boss'

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
}

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
  job?: Pick<
    JobPosting,
    'company' | 'title' | 'position' | 'city' | 'salary' | 'externalUrl' | 'externalId' | 'jd' | 'source'
  >
  bossUrl?: string
  jobSource?: JobSource
  bossApply?: { ok: boolean; inApp?: boolean; message: string }
}

export type BossApplyStatus = 'pending' | 'sending' | 'sent' | 'failed'

export type JobAnalysis = {
  summary: string
  matchScore: number
  tier: string
  pros: string[]
  cons: string[]
  advice: string[]
  interviewFocus: string[]
  salaryInsight: string
  demo: boolean
}

export type AutoApplyMode = 'off' | 'review' | 'auto'

export type JobMatchTier = 'S' | 'A' | 'B' | 'C'

export type JobMatchStatus = 'pending_review' | 'queued' | 'applied' | 'skipped'

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
  maxJobsAutoCrawl?: number
  maxJobsManualCrawl?: number
  maxManualCrawlsPerDay?: number
  dailyRecommendLimit?: number
  manualCrawlPositions?: string[]
  manualCrawlCities?: string[]
  manualCrawlSalaryMin?: number
  manualCrawlSalaryMax?: number
  resumeSummary?: string
  lastCrawlAt?: string
  updatedAt: string
}

export type ResumeBasicInfo = {
  name?: string
  phone?: string
  email?: string
  city?: string
  title?: string
  avatarUrl?: string
  avatarShape?: 'circle' | 'square' | 'rounded'
  fieldVisibility?: {
    avatar?: boolean
    title?: boolean
    phone?: boolean
    email?: boolean
    city?: boolean
  }
}

export type ResumeContent = {
  basic?: ResumeBasicInfo
  education?: Array<{ school: string; major?: string; degree?: string; start?: string; end?: string }>
  experience?: Array<{
    company: string
    title: string
    department?: string
    city?: string
    start?: string
    end?: string
    highlights: string[]
    detail?: string
  }>
  projects?: Array<{ name: string; role?: string; desc?: string; techStack?: string[]; highlights: string[] }>
  skills?: string[]
  selfIntro?: string
  honors?: Array<{ title: string; date?: string; desc?: string }>
  certificates?: Array<{ name: string; issuer?: string; date?: string }>
  customSections?: Array<{ id: string; title: string; body?: string }>
}

export type ResumeLayoutConfig = {
  sectionOrder?: string[]
  sectionVisibility?: Record<string, boolean>
  previewSettings?: Record<string, unknown>
}

export type ResumeOptimizeChange = { section: string; before: string; after: string }

export type ResumeOptimizeResult = {
  content: ResumeContent
  optimizedText: string
  summary: string
  suggestions: string[]
  changes: ResumeOptimizeChange[]
  source?: 'llm' | 'demo'
}

export type ResumeParseResult = {
  content: ResumeContent
  source: 'llm' | 'demo'
  fieldCoverage?: ResumeFieldCoverageItem[]
}

export type ResumeFieldCoverageItem = {
  key: string
  label: string
  status: 'ok' | 'missing' | 'low'
  hint?: string
}

export type ResumeExtractResult = {
  text: string
  fileName?: string
  charCount: number
}

export type ResumeGenerateResult = {
  content: ResumeContent
  title: string
  summary: string
  rawText: string
  source: 'llm' | 'demo'
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

export type CrawlTrigger = 'manual' | 'scheduled' | 'agent'

export type CrawlRun = {
  id: string
  userId: string
  source: JobSource
  trigger?: CrawlTrigger
  query: string
  jobsFound: number
  jobsNew: number
  status: 'running' | 'success' | 'failed'
  error?: string
  startedAt: string
  finishedAt?: string
}

export type JobNotification = {
  id: string
  userId: string
  applicationId?: string
  jobId?: string
  type: 'interview_invited' | 'hr_reply' | 'apply_failed' | 'auto_applied'
  title: string
  body: string
  read: boolean
  createdAt: string
}

export type AgentActionLog = {
  id: string
  userId: string
  actionType: string
  title: string
  body: string
  jobId?: string
  applicationId?: string
  meta?: Record<string, unknown>
  createdAt: string
}

export type BossChatCategory = 'new_greeting' | 'communicating'

export type BossChatItem = {
  jobId?: string
  company?: string
  title?: string
  lastMessage?: string
  unread?: number
  hrName?: string
  salary?: string
  updatedAt?: string
  category?: BossChatCategory
  relationType?: number
}

export type BossChatMessage = {
  id: string
  role: 'hr' | 'user' | 'ai'
  content: string
  sentAt: string
  intent?: string
  aiSuggested?: boolean
}

export type HrAnalysis = {
  intent: string
  shouldReply: boolean
  suggestedReply: string
  summary: string
}

export type ChatHistoryItem = {
  role: 'interviewer' | 'candidate'
  content: string
}

export type SpeechEngine = 'browser' | 'doubao'

export type DoubaoVoice = {
  id: string
  label: string
  category: '推荐' | '明星IP' | '角色' | '情感' | '通用'
  resourceId: string
  recommended?: boolean
}

export type InterviewReportSummary = {
  id: string
  position: string
  experience: string
  totalScore: number
  answerCount: number
  overallRating: string
  summary: string
  createdAt: string
}

export type InterviewReportDetail = InterviewReportSummary & {
  sessionId: string
  sourceQuestionId?: string
  sourceCategory?: string
  sharedExperienceId?: string | null
  sharedExperienceStatus?: Experience['status'] | null
  strengths: string[]
  improvements: string[]
  nextSteps: string[]
  scoreBreakdown: { topic: string; score: number; comment: string }[]
  transcript: ChatHistoryItem[]
  rounds: {
    topic: string
    question: string
    answer: string
    score: number
    feedback: string
    dimensions?: {
      accuracy: number
      depth: number
      structure: number
      practice: number
    }
  }[]
}

export type InterviewReportPayload = {
  summary: string
  strengths: string[]
  improvements: string[]
  overallRating: string
  nextSteps: string[]
  scoreBreakdown: { topic: string; score: number; comment: string }[]
}

export type AdminTrendMetric = {
  current: number
  previous: number
  delta: string
  up: boolean | undefined
}

export type AdminActivityItem = {
  id: string
  type: 'question' | 'report' | 'session' | 'user' | 'candidate'
  title: string
  subtitle?: string
  createdAt: string
  href?: string
}

export type AdminDashboard = {
  counters: Record<string, number>
  gateway: { hits: number; misses: number; hitRate: number; variantUsage: Record<string, number> }
  quality: {
    sessionCompletionRate: number
    avgTypeCoverage: number
    avgInterviewScore: number
    totalReports: number
    pendingReviewQuestions: number
  }
  questionsByStatus: Record<string, number>
  trends: {
    questions: AdminTrendMetric
    reports: AdminTrendMetric
    sessions: AdminTrendMetric
    users: AdminTrendMetric
  }
  recentActivity: AdminActivityItem[]
}

export type AdminNotification = {
  id: string
  type: string
  title: string
  body?: string
  href?: string
  createdAt: string
}

export type AdminUser = {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  createdAt: string
}

export type AdminQuestionOverview = {
  total: number
  byCategory: Record<string, number>
  byDifficulty: Record<string, number>
  byStatus: Record<string, number>
  qualityComplete: number
}

export type AdminUserDetail = {
  user: AdminUser
  stats: { reports: number; resumes: number; applications: number }
  recentReports: { id: string; position: string; totalScore: number; createdAt: string }[]
  resumes: { id: string; title: string; updatedAt: string }[]
}

export type ResumeShareAdminItem = {
  token: string
  userId: string
  resumeId: string
  title: string
  createdAt: string
  expiresAt?: string
  expired: boolean
}

export type AdminMetrics = {
  quality?: {
    sessionCompletionRate: number
    avgTypeCoverage: number
    avgInterviewScore: number
    totalReports: number
    sessionsWithFullRubric: number
    llmFallbackRate: number
    llmCacheHitRate: number
  }
  collectedAt?: string
  [key: string]: unknown
}

export type QualityRegressionReport = {
  total: number
  passed: number
  failed: number
  duplicates: { id: string; title: string; duplicateOf: { id: string; title: string } }[]
  items: { id: string; title: string; status?: string; issues: string[] }[]
  ranAt: string
}

export type UserProfile = {
  user: { id: string; name: string; email: string; role: string; createdAt?: string }
  stats: {
    practiced: number
    mastered: number
    favorites: number
    reports: number
    interviews: number
  }
  categoryProgress: Record<
    string,
    { practiced: number; mastered: number; favorites: number; total: number }
  >
  questionTotal: number
  recentReports: {
    id: string
    position: string
    totalScore: number
    overallRating: string
    createdAt: string
    sourceQuestionId?: string
    sourceCategory?: string
  }[]
  favorites: { id: string; title: string; category: string; difficulty: string }[]
  syncEnabled: boolean
}

export type LearningPathStage = {
  id: string
  title: string
  questionIds: string[]
  total: number
  mastered: number
  practiced: number
  completed: number
  progressPct: number
}

export type LearningPath = {
  id: string
  title: string
  category: string
  slug: string
  color: string
  stages: LearningPathStage[]
  totalQuestions: number
  completedQuestions: number
  progressPct: number
}

export type QuestionProgress = {
  questionId: string
  status: 'practiced' | 'mastered'
  favorite: boolean
  updatedAt: string
}

export type PracticeStats = {
  practiced: number
  mastered: number
  favorites: number
}

export type CandidateQuestion = {
  id: string
  experienceId: string
  title: string
  category: string
  difficulty: string
  tags: string[]
  content: string
  type: string
  referenceAnswer: string
  keyPoints: string[]
  scoringRubric: string
  followUpTemplates: string[]
  status: string
  createdAt: string
}

export type BossBindOptions = {
  bossCookie?: string
  bossConnectId?: string
}

export const api = {
  getHealth: () => request<{ ok: boolean }>('/health'),

  getAuthStatus: () => request<{ enabled: boolean; user: AuthUser | null }>('/auth/status'),

  login: (email: string, password: string, boss?: BossBindOptions) =>
    request<{ user: AuthUser; token: string; bossBound?: boolean; bossName?: string; bossError?: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          bossCookie: boss?.bossCookie,
          bossConnectId: boss?.bossConnectId,
        }),
      },
    ),

  register: (email: string, password: string, name: string, boss?: BossBindOptions) =>
    request<{ user: AuthUser; token: string; bossBound?: boolean; bossName?: string; bossError?: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          name,
          bossCookie: boss?.bossCookie,
          bossConnectId: boss?.bossConnectId,
        }),
      },
    ),

  startBossConnect: () =>
    request<{
      connectId: string
      mode: 'qr' | 'browser'
      browserLaunched?: boolean
      bossLoginUrl?: string
      message: string
      installHint?: string
    }>('/boss/connect/start', { method: 'POST' }),

  getBossConnectStatus: (connectId: string) =>
    request<{
      status: string
      qrImageBase64?: string
      bossName?: string
      error?: string
      inProgress?: boolean
      loggedInPending?: boolean
      playwright?: boolean
    }>(`/boss/connect/${connectId}/status`),

  syncBossConnect: (connectId: string) =>
    request<{
      status: string
      qrImageBase64?: string
      bossName?: string
      error?: string
      loggedInPending?: boolean
    }>(`/boss/connect/${connectId}/sync`, { method: 'POST' }),

  refreshBossConnectQr: (connectId: string) =>
    request<{ ok: boolean; message?: string }>(`/boss/connect/${connectId}/refresh`, { method: 'POST' }),

  cancelBossConnect: (connectId: string) =>
    request<{ ok: boolean }>(`/boss/connect/${connectId}`, { method: 'DELETE' }),

  completeBossConnect: (connectId: string) =>
    request<{ ok: boolean; bossName?: string; message: string }>(`/boss/connect/${connectId}/complete`, {
      method: 'POST',
    }),

  getMe: () => request<{ user: AuthUser }>('/auth/me'),

  getInterviewStatus: () =>
    request<{ llmConfigured: boolean; mode: string }>('/interview/status'),

  startInterview: (
    position: string,
    experience: string,
    mode: 'quick' | 'standard' | 'deep' = 'standard',
    questionId?: string,
    applicationId?: string,
  ) =>
    request<{ sessionId: string; message: string; demo: boolean; questionPlan?: { id: string; title: string }[] }>(
      '/interview/start',
      {
        method: 'POST',
        body: JSON.stringify({ position, experience, mode, questionId, applicationId }),
      },
    ),

  chatInterview: (sessionId: string, message: string, history: ChatHistoryItem[]) =>
    request<{
      reply: string
      scoreDelta: number
      feedback: string
      finished: boolean
      totalScore: number
      report?: InterviewReportPayload
      reportId?: string | null
      demo: boolean
    }>('/interview/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, history }),
    }),

  async chatInterviewStream(
    sessionId: string,
    message: string,
    history: ChatHistoryItem[],
    onDelta: (text: string) => void,
    onMeta: (meta: { scoreDelta: number; feedback: string; totalScore: number }) => void,
  ) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authToken) headers.Authorization = `Bearer ${authToken}`

    const res = await fetch(`${API_BASE}/interview/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId, message, history }),
    })

    if (!res.ok) throw new Error('Stream request failed')

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false
    let totalScore = 0
    let reportId: string | null = null
    let report: InterviewReportPayload | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = JSON.parse(line.slice(6)) as {
          type: string
          text?: string
          scoreDelta?: number
          feedback?: string
          totalScore?: number
          finished?: boolean
          reply?: string
        }

        if (payload.type === 'meta') {
          onMeta({
            scoreDelta: payload.scoreDelta ?? 0,
            feedback: payload.feedback ?? '',
            totalScore: payload.totalScore ?? 0,
          })
          if (payload.reply) onDelta(payload.reply)
        } else if (payload.type === 'delta' && payload.text) {
          onDelta(payload.text)
        } else if (payload.type === 'done') {
          finished = payload.finished ?? false
          totalScore = payload.totalScore ?? totalScore
          reportId = (payload as { reportId?: string }).reportId ?? null
          report = (payload as { report?: InterviewReportPayload }).report ?? null
        }
      }
    }

    return { finished, totalScore, report, reportId }
  },

  listReports: () => request<{ items: InterviewReportSummary[] }>('/reports'),

  getReport: (id: string) => request<InterviewReportDetail>(`/reports/${id}`),

  getReportSharePreview: (id: string) =>
    request<
      | { alreadyShared: true; experienceId: string; status: Experience['status'] }
      | { alreadyShared: false; draft: ReportExperienceDraft }
    >(`/reports/${id}/share-preview`),

  shareReportToExperience: (
    id: string,
    data: {
      company: string
      result?: ReportExperienceDraft['result']
      author?: string
      date?: string
      summary?: string
      content?: string
    },
  ) =>
    request<{ experience: Experience; message: string }>(`/reports/${id}/share-experience`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteReport: (id: string) => request<{ ok: boolean }>(`/reports/${id}`, { method: 'DELETE' }),

  getAssistSuggestion: (sessionId: string, question: string, variant = 0) =>
    request<{ suggestion: string; demo: boolean }>('/interview/assist', {
      method: 'POST',
      body: JSON.stringify({ sessionId, question, variant }),
    }),

  getTtsStatus: () =>
    request<{ configured: boolean; provider: string }>('/tts/status'),

  getTtsVoices: () =>
    request<{ voices: DoubaoVoice[]; configured: boolean }>('/tts/voices'),

  async synthesizeSpeech(
    text: string,
    speaker: string,
    resourceId?: string,
    signal?: AbortSignal,
  ): Promise<Blob> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    const res = await fetch(`${API_BASE}/tts/synthesize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, speaker, resourceId }),
      signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error((err as { error?: string }).error ?? 'TTS failed')
    }
    return res.blob()
  },

  listQuestions: (params?: {
    category?: string
    search?: string
    status?: string
    difficulty?: string
    page?: number
    pageSize?: number
  }) => {
    const q = new URLSearchParams()
    if (params?.category) q.set('category', params.category)
    if (params?.search) q.set('search', params.search)
    if (params?.status) q.set('status', params.status)
    if (params?.difficulty) q.set('difficulty', params.difficulty)
    if (params?.page != null) q.set('page', String(params.page))
    if (params?.pageSize != null) q.set('pageSize', String(params.pageSize))
    const qs = q.toString()
    return request<{
      items: Question[]
      total?: number
      page?: number
      pageSize?: number
      countsByStatus?: Record<string, number>
    }>(`/questions${qs ? `?${qs}` : ''}`)
  },

  getQuestionStats: () =>
    request<{ total: number; byCategory: Record<string, number>; byDifficulty: Record<string, number> }>(
      '/questions/stats',
    ),

  getQuestion: (id: string) => request<Question>(`/questions/${id}`),

  createQuestion: (data: Omit<Question, 'id' | 'views' | 'createdAt'>) =>
    request<Question>('/questions', { method: 'POST', body: JSON.stringify(data) }),

  updateQuestion: (id: string, data: Partial<Omit<Question, 'id' | 'createdAt'>>) =>
    request<Question>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteQuestion: (id: string) =>
    request<{ ok: boolean }>(`/questions/${id}`, { method: 'DELETE' }),

  listExperiences: () => request<{ items: Experience[] }>('/experiences'),

  getExperience: (id: string) => request<Experience>(`/experiences/${id}`),

  createExperience: (data: Omit<Experience, 'id' | 'createdAt'>) =>
    request<Experience>('/experiences', { method: 'POST', body: JSON.stringify(data) }),

  updateExperience: (id: string, data: Partial<Omit<Experience, 'id' | 'createdAt'>>) =>
    request<Experience>(`/experiences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteExperience: (id: string) =>
    request<{ ok: boolean }>(`/experiences/${id}`, { method: 'DELETE' }),

  getAdminDashboard: () => request<AdminDashboard>('/admin/dashboard'),

  getAdminNotifications: () =>
    request<{ items: AdminNotification[] }>('/admin/notifications'),

  getAdminQuestionOverview: () => request<AdminQuestionOverview>('/admin/questions/overview'),

  getAdminUser: (id: string) => request<AdminUserDetail>(`/admin/users/${id}`),

  listAdminResumeShares: () => request<{ items: ResumeShareAdminItem[] }>('/admin/resume-shares'),

  revokeAdminResumeShare: (token: string) =>
    request<{ ok: boolean }>(`/admin/resume-shares/${token}`, { method: 'DELETE' }),

  createAdminJob: (body: Omit<JobPosting, 'id' | 'createdAt' | 'source'>) =>
    request<JobPosting>('/admin/jobs', { method: 'POST', body: JSON.stringify(body) }),

  updateAdminJob: (id: string, body: Partial<Omit<JobPosting, 'id' | 'createdAt' | 'source'>>) =>
    request<JobPosting>(`/admin/jobs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteAdminJob: (id: string) =>
    request<{ ok: boolean }>(`/admin/jobs/${id}`, { method: 'DELETE' }),

  reviewQuestion: (id: string, action: 'approve' | 'reject' | 'archive') =>
    request<Question>(`/admin/questions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  listReviewQuestions: (status = 'review') =>
    request<{ items: Question[] }>(`/admin/questions/review?status=${status}`),

  listCandidates: (status = 'review') =>
    request<{ items: CandidateQuestion[] }>(`/admin/candidates?status=${status}`),

  reviewCandidate: (id: string, action: 'approve' | 'reject') =>
    request<{ candidate: CandidateQuestion; question?: Question }>(`/admin/candidates/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  generateQuestionsFromExperience: (experienceId: string) =>
    request<{ items: CandidateQuestion[] }>(`/admin/experiences/${experienceId}/generate-questions`, {
      method: 'POST',
    }),

  listAdminUsers: () => request<{ items: AdminUser[] }>('/admin/users'),

  updateAdminUserRole: (id: string, role: 'user' | 'admin') =>
    request<AdminUser>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  runQualityRegression: () =>
    request<QualityRegressionReport>('/admin/quality/regression', { method: 'POST' }),

  getAdminMetrics: () => request<AdminMetrics>('/admin/metrics'),

  getAdminGateway: () =>
    request<{ hits: number; misses: number; hitRate: number; variantUsage: Record<string, number> }>(
      '/admin/gateway',
    ),

  bulkUpdateQuestionStatus: (ids: string[], status: string) =>
    request<{ updated: number }>('/admin/questions/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    }),

  purgeAdminCache: () =>
    request<{ ok: boolean; message?: string }>('/admin/cache/purge', { method: 'POST' }),

  uploadQuestionImage: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const headers: Record<string, string> = {}
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    const res = await fetch(`${API_BASE}/admin/uploads/image`, {
      method: 'POST',
      headers,
      body: fd,
    })
    const data = (await res.json()) as { error?: string; url?: string; filename?: string; size?: number }
    if (res.status === 401) setAuthToken(null)
    if (!res.ok) throw new Error(data.error ?? '图片上传失败')
    if (!data.url) throw new Error('上传响应无效')
    return { url: data.url, filename: data.filename ?? '', size: data.size ?? 0 }
  },

  getPracticeProgress: () =>
    request<{ items: QuestionProgress[]; stats: PracticeStats; syncEnabled: boolean }>('/practice'),

  updatePracticeProgress: (
    questionId: string,
    patch: Partial<Pick<QuestionProgress, 'status' | 'favorite'>>,
  ) =>
    request<{ item: QuestionProgress; stats: PracticeStats }>(`/practice/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  syncPracticeProgress: (items: QuestionProgress[]) =>
    request<{ items: QuestionProgress[]; stats: PracticeStats }>('/practice/sync', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  getProfile: () => request<UserProfile>('/profile'),

  getLearningPaths: () => request<{ items: LearningPath[] }>('/paths'),

  reviewExperience: (id: string, action: 'approve' | 'reject') =>
    request<Experience>(`/admin/experiences/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  listJobs: () => request<{ items: JobPosting[] }>('/jobs'),

  getJob: (id: string) => request<JobPosting>(`/jobs/${id}`),

  createJob: (body: Omit<JobPosting, 'id' | 'createdAt'>) =>
    request<JobPosting>('/jobs', { method: 'POST', body: JSON.stringify(body) }),

  listApplications: () =>
    request<{ items: JobApplication[]; syncEnabled: boolean }>('/applications'),

  previewJobGreeting: (jobId: string, resumeSummary?: string) =>
    request<{ greeting: string }>('/applications/greeting-preview', {
      method: 'POST',
      body: JSON.stringify({ jobId, resumeSummary }),
    }),

  applyJob: (jobId: string, opts?: { greeting?: string; resumeSummary?: string }) =>
    request<JobApplication>('/applications/apply', {
      method: 'POST',
      body: JSON.stringify({ jobId, ...opts }),
    }),

  markInterviewInvited: (applicationId: string) =>
    request<JobApplication>(`/applications/${applicationId}/mark-interview`, { method: 'POST' }),

  getAdminJobApplications: () =>
    request<{ items: JobApplication[] }>('/admin/job-applications'),

  getJobPreferences: () =>
    request<{ preference: JobPreference; crawlEnabled: boolean; manualCrawlsToday?: number }>(
      '/jobs/preferences',
    ),

  updateJobPreferences: (body: Partial<Omit<JobPreference, 'userId' | 'updatedAt' | 'lastCrawlAt'>>) =>
    request<JobPreference>('/jobs/preferences', { method: 'PUT', body: JSON.stringify(body) }),

  getJobRecommendations: () =>
    request<{
      items: JobMatch[]
      preference: JobPreference
      lastCrawlAt?: string
      firecrawlConfigured: boolean
      bossBound?: boolean
      manualCrawlsToday?: number
      recommendLimit?: number
      recentRuns: CrawlRun[]
    }>('/jobs/recommendations'),

  triggerBossCrawl: (body?: {
    positions?: string[]
    cities?: string[]
    salaryMin?: number
    salaryMax?: number
    batchGreet?: boolean
  }) =>
    request<{
      ok: boolean
      message?: string
      jobsFound: number
      jobsNew: number
      matchesUpdated: number
      firecrawlConfigured: boolean
      source?: string
      apply?: { applied: number; total?: number; skippedAlready?: number; skipped?: string; mode?: string; message?: string }
      inbox?: { replies: number; interviews: number; syncedChats?: number; message?: string }
    }>('/jobs/crawl', { method: 'POST', body: JSON.stringify(body ?? {}) }),

  batchGreetMatches: (matchIds?: string[]) =>
    request<{
      applied: number
      total: number
      failed?: number
      failures?: string[]
      skipped?: string
      message?: string
    }>('/jobs/matches/batch-greet', {
      method: 'POST',
      body: JSON.stringify({ matchIds }),
    }),

  purgeDemoJobs: () =>
    request<{
      ok: boolean
      removed: number
      matches?: number
      applications?: number
      chats?: number
      message?: string
    }>('/jobs/purge-demo', { method: 'POST' }),

  listCrawlRuns: () => request<{ items: CrawlRun[] }>('/jobs/crawl/runs'),

  getJobAnalysis: (jobId: string) =>
    request<{ job: JobPosting; analysis: JobAnalysis }>(`/jobs/${jobId}/analysis`),

  getBossSession: () =>
    request<{
      bound: boolean
      bossName?: string
      status?: string
      needRebind?: boolean
      rebindReason?: string
      profileDir?: string
      lastKeepaliveAt?: string
      lastValidatedAt?: string
      safety?: { paused: boolean; reason?: string; until?: string }
    }>('/boss/session'),

  saveBossSession: (cookie: string) =>
    request<{ ok: boolean; bossName?: string; message: string }>('/boss/session', {
      method: 'POST',
      body: JSON.stringify({ cookie }),
    }),

  syncBossApplications: () =>
    request<{ replies: number; interviews: number; syncedChats?: number; message?: string }>(
      '/boss/sync',
      { method: 'POST' },
    ),

  getJobNotifications: (unreadOnly?: boolean) =>
    request<{ items: JobNotification[] }>(`/boss/notifications${unreadOnly ? '?unread=1' : ''}`),

  markJobNotificationsRead: (ids?: string[]) =>
    request<{ ok: boolean }>('/boss/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  getAgentLogs: (limit = 50) =>
    request<{ items: AgentActionLog[] }>(`/jobs/agent-logs?limit=${limit}`),

  getJobMatches: (params?: { tier?: string; city?: string; salaryMin?: number }) => {
    const q = new URLSearchParams()
    if (params?.tier) q.set('tier', params.tier)
    if (params?.city) q.set('city', params.city)
    if (params?.salaryMin) q.set('salaryMin', String(params.salaryMin))
    const qs = q.toString()
    return request<{ items: JobMatch[] }>(`/jobs/matches${qs ? `?${qs}` : ''}`)
  },

  approveJobMatch: (matchId: string) =>
    request<{ ok: boolean; match: JobMatch }>(`/jobs/matches/${matchId}/approve`, { method: 'POST' }),

  crawlBossFiltered: (filters: Record<string, unknown>) =>
    request<{ ok: boolean; mode?: string; message?: string; jobsFound?: number }>('/jobs/crawl/filtered', {
      method: 'POST',
      body: JSON.stringify(filters),
    }),

  scoreQuizAnswer: (questionId: string, answer: string) =>
    request<{
      score: number
      accuracy: number
      depth: number
      structure: number
      practice: number
      feedback: string
      strengths: string[]
      weaknesses: string[]
      comparison: string
      source?: 'llm' | 'demo'
    }>('/quiz/score', { method: 'POST', body: JSON.stringify({ questionId, answer }) }),

  getBossChats: () =>
    request<{ items: BossChatItem[]; error?: string; localOnly?: boolean }>('/boss/chats'),

  getBossChatMessages: (jobId: string) =>
    request<{ items: BossChatMessage[] }>(`/boss/chats/${encodeURIComponent(jobId)}/messages`),

  suggestBossReply: (jobId: string, hrMessage: string, postingJobId?: string) =>
    request<{ analysis: HrAnalysis }>(`/boss/chats/${encodeURIComponent(jobId)}/suggest-reply`, {
      method: 'POST',
      body: JSON.stringify({ hrMessage, postingJobId }),
    }),

  sendBossChatReply: (
    jobId: string,
    message: string,
    meta?: { company?: string; jobTitle?: string },
  ) =>
    request<{ ok: boolean; message: string }>(`/boss/chats/${encodeURIComponent(jobId)}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message, ...meta }),
    }),

  // ---- Smart Import APIs ----

  getImportHealth: (probe = false) =>
    request<{
      llmConfigured: boolean
      demoFallback: boolean
      reachable?: boolean | null
      latencyMs?: number
      error?: string
    }>(`/import/health${probe ? '?probe=1' : ''}`),

  /** AI 从文本中提取题目 */
  parseTextToQuestions: (text: string, category: string) =>
    request<{
      questions: Array<{
        title: string
        content: string
        difficulty: string
        type: string
        tags: string[]
        keyPoints: string[]
        referenceAnswer: string
        scoringRubric: string
        followUpTemplates: string[]
        status: string
        warnings?: string[]
      }>
      count: number
      truncated?: boolean
      originalLength?: number
      source?: 'llm' | 'demo'
    }>('/import/parse-text', { method: 'POST', body: JSON.stringify({ text, category }) }),

  /** 上传 PDF/TXT/MD 并 AI 解析题目 */
  uploadImportFile: async (file: File, category: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', category)
    const abort = new AbortController()
    const timeoutId = setTimeout(() => abort.abort(), RESUME_UPLOAD_TIMEOUT_MS)
    try {
      const headers: Record<string, string> = {}
      if (authToken) headers.Authorization = `Bearer ${authToken}`
      const res = await fetch(`${API_BASE}/import/upload-file`, {
        method: 'POST',
        headers,
        body: fd,
        signal: abort.signal,
      })
      const data = (await res.json()) as {
        error?: string
        code?: string
        extractedText?: string
        fileName?: string
        questions?: unknown[]
        count?: number
        truncated?: boolean
        originalLength?: number
      }
      if (res.status === 401) setAuthToken(null)
      if (!res.ok) {
        throw new ImportUploadError(
          friendlyApiError(data.error ?? '上传解析失败'),
          data.extractedText,
          data.code,
        )
      }
      return data as {
        fileName: string
        questions: Array<{
          title: string
          content: string
          difficulty: string
          type: string
          tags: string[]
          keyPoints: string[]
          referenceAnswer: string
          scoringRubric: string
          followUpTemplates: string[]
          status: string
          category?: string
        }>
        count: number
        truncated?: boolean
        originalLength?: number
        source?: 'llm' | 'demo'
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new Error('上传超时，请检查网络或尝试较小文件')
      }
      throw e
    } finally {
      clearTimeout(timeoutId)
    }
  },

  /** AI 根据标题生成题目内容 */
  generateQuestionContent: (title: string, category: string, difficulty: string) =>
    request<{
      content: string
      keyPoints: string[]
      referenceAnswer: string
      scoringRubric: string
      followUpTemplates: string[]
      source?: 'llm' | 'demo'
    }>('/import/generate-content', { method: 'POST', body: JSON.stringify({ title, category, difficulty }) }),

  /** AI 为已有题目补全质量字段 */
  suggestQuestionFields: (title: string, content: string, category: string, difficulty: string) =>
    request<{
      keyPoints: string[]
      referenceAnswer: string
      scoringRubric: string
      followUpTemplates: string[]
    }>('/import/suggest-fields', { method: 'POST', body: JSON.stringify({ title, content, category, difficulty }) }),

  /** 批量导入题目 */
  batchImportQuestions: (
    questions: Array<{
      title: string
      content: string
      category: string
      difficulty: string
      type?: string
      tags?: string[]
      keyPoints?: string[]
      referenceAnswer?: string
      scoringRubric?: string
      followUpTemplates?: string[]
      status?: string
    }>,
    autoPublish?: boolean,
  ) =>
    request<{
      results: Array<{
        id: string
        title: string
        status: string
        error?: string
        warnings?: string[]
      }>
      summary: { total: number; created: number; skipped: number; failed: number }
    }>('/import/batch', { method: 'POST', body: JSON.stringify({ questions, autoPublish }) }),

  // ---- Resume APIs ----

  getResumes: () =>
    request<{ resumes: UserResume[]; resume: UserResume | null; syncEnabled: boolean }>('/resumes'),

  /** @deprecated 使用 getResumes */
  getResume: () =>
    request<{ resume: UserResume | null; syncEnabled: boolean }>('/resumes'),

  getResumeById: (id: string) => request<{ resume: UserResume }>(`/resumes/${id}`),

  createResume: (body?: { title?: string; templateId?: string }) =>
    request<{ resume: UserResume }>('/resumes', { method: 'POST', body: JSON.stringify(body ?? {}) }),

  updateResume: (id: string, body: Partial<Omit<UserResume, 'id' | 'userId' | 'updatedAt'>>) =>
    request<{ resume: UserResume }>(`/resumes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteResume: (id: string) => request<{ ok: boolean }>(`/resumes/${id}`, { method: 'DELETE' }),

  getResumeHealth: (probe = false) =>
    request<{
      llmConfigured: boolean
      demoMode: boolean
      syncEnabled: boolean
      reachable?: boolean | null
      latencyMs?: number
      error?: string
    }>(`/resumes/health${probe ? '?probe=1' : ''}`),

  parseResumeText: (text: string, resumeId?: string) =>
    request<{ content: ResumeContent; source: ResumeParseResult['source']; resume: UserResume }>(
      '/resumes/parse-text',
      {
        method: 'POST',
        body: JSON.stringify({ text, resumeId }),
      },
    ),

  parseResumePreview: (text: string) =>
    request<ResumeParseResult>(
      '/resumes/parse-preview',
      { method: 'POST', body: JSON.stringify({ text }) },
      RESUME_AI_TIMEOUT_MS,
    ),

  extractResumeText: (text: string) =>
    request<ResumeExtractResult>('/resumes/extract', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  extractResumeFile: async (file: File) => {
    if (file.size > RESUME_UPLOAD_MAX_BYTES) {
      throw new Error(`文件超过 ${RESUME_UPLOAD_MAX_BYTES / 1024 / 1024}MB 上限`)
    }
    const fd = new FormData()
    fd.append('file', file)
    return fetchMultipart<ResumeExtractResult>('/resumes/extract', fd)
  },

  generateResume: (body: { targetJob: string; personalInfo: string }) =>
    request<{ result: ResumeGenerateResult; resume: UserResume }>(
      '/resumes/generate',
      { method: 'POST', body: JSON.stringify(body) },
      RESUME_AI_TIMEOUT_MS,
    ),

  uploadResumeFile: async (file: File, resumeId?: string, opts?: { parse?: boolean }) => {
    if (file.size > RESUME_UPLOAD_MAX_BYTES) {
      throw new Error(`文件超过 ${RESUME_UPLOAD_MAX_BYTES / 1024 / 1024}MB 上限`)
    }
    const fd = new FormData()
    fd.append('file', file)
    if (resumeId) fd.append('resumeId', resumeId)
    if (opts?.parse === false) fd.append('parse', 'false')
    return fetchMultipart<{
      error?: string
      content?: ResumeContent
      source?: ResumeParseResult['source']
      resume?: UserResume
      extractedText?: string
      text?: string
      fileName?: string
      charCount?: number
    }>('/resumes/upload', fd)
  },

  optimizeResume: (opts?: { text?: string; content?: ResumeContent; jobId?: string; resumeId?: string }) =>
    request<{
      result: ResumeOptimizeResult
      resume: UserResume
      job: { id: string; company: string; title: string } | null
    }>(
      '/resumes/optimize',
      { method: 'POST', body: JSON.stringify(opts ?? {}) },
      RESUME_AI_TIMEOUT_MS,
    ),

  syncResumeSummary: () =>
    request<{ ok: boolean; resumeSummary?: string }>('/resumes/sync-summary', { method: 'POST' }),

  getPublicResume: (token: string) =>
    request<{
      title: string
      templateId: string
      content: ResumeContent
      layoutConfig?: ResumeLayoutConfig
      sharedAt: string
      expiresAt?: string | null
    }>(`/public/r/${token}`),

  getResumeShare: (resumeId: string) =>
    request<{
      share: { token: string; sharedAt: string; expiresAt?: string | null } | null
    }>(`/resumes/${resumeId}/share`),

  createResumeShare: (resumeId: string, opts?: { expiresInDays?: number | null }) =>
    request<{ share: { token: string; sharedAt: string; expiresAt?: string | null } }>(
      `/resumes/${resumeId}/share`,
      {
        method: 'POST',
        body: JSON.stringify(opts ?? {}),
      },
    ),

  revokeResumeShare: (resumeId: string) =>
    request<{ ok: boolean }>(`/resumes/${resumeId}/share`, { method: 'DELETE' }),

  getResumePdfHealth: () => request<{ available: boolean }>('/resumes/export-pdf/health'),

  exportResumePdf: async (resumeId: string, html: string, filename?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    const res = await fetch(`${API_BASE}/resumes/${resumeId}/export-pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ html, filename }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error((err as { error?: string }).error ?? 'PDF 导出失败')
    }
    return res.blob()
  },

  trackResumeExport: (format: 'pdf' | 'png' | 'jpg' | 'server-pdf') =>
    request<{ ok: boolean }>('/resumes/track-export', {
      method: 'POST',
      body: JSON.stringify({ format }),
    }).catch(() => ({ ok: false })),
}
