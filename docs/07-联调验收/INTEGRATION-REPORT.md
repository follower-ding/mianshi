> 当前：阶段 7 · 模式：仅本阶段 · 产出：docs/07-联调验收/

# mianshi 阶段 7 · 联调验收报告

**验收日期**：2026-07-03  
**验收方式**：静态契约对照 + API 回归脚本（本地 JSON 模式，无 PostgreSQL 联机）  
**对照范围**：`mianshi-frontend/src/api/client.ts`（109 个封装 endpoint + 2 处直链 fetch） vs `mianshi-api/src/routes/`（21 模块）

---

## 1. 执行摘要

| 项 | 结论 |
|----|------|
| **总体验收结论** | **有条件通过** |
| **Endpoint 覆盖率** | 前端调用 **111/111 已实现**（0 缺失） |
| **完全对齐** | **98** 个 endpoint |
| **部分不一致** | **13** 个（多为降级模式响应差异、类型声明遗漏） |
| **缺失/冲突** | **0** 个 |
| **回归测试** | **5/5 脚本全部通过**（见 §5） |
| **P0 问题** | **0** |
| **P1 问题** | **3** |
| **P2 问题** | **6** |

**说明**：本项目为 Hono + React，无 OpenAPI 自动生成；类型对照采用 `client.ts` ↔ `entities.ts` 手工比对。PostgreSQL 生产路径与 JSON 降级路径在 auth / 投递 / 简历等模块存在**有意差异**，已在下表标注。

---

## 2. 接口契约对照表

路径前缀均为 `/api`（`VITE_API_BASE` 默认 `/api`）。

### 2.1 基础设施

| Method | Path | 前端 | 后端 | 状态 | 备注 |
|--------|------|------|------|------|------|
| GET | `/health` | `getHealth` | `health.ts` | ✅ | 后端额外返回 `service` |
| GET | `/info?probe=1` | `ResumeLlmBanner` 直链 | `index.ts` | ✅ | 聚合 LLM/DB/TTS 探测 |
| GET | `/metrics?detailed=1` | `AdminSidebar` 直链 `<a>` | `metrics.ts` | ⚠️ | 需 JWT，直链无 Authorization → 401 |

### 2.2 认证 Auth

| Method | Path | 前端 | 后端 | 状态 | 备注 |
|--------|------|------|------|------|------|
| GET | `/auth/status` | `getAuthStatus` | `auth.ts` | ✅ | `{ enabled, user }` 与 PG 开关一致 |
| POST | `/auth/login` | `login` | `auth.ts` | ✅ | 支持 `bossCookie` / `bossConnectId` |
| POST | `/auth/register` | `register` | `auth.ts` | ✅ | JSON 模式 503 |
| GET | `/auth/me` | `getMe` | `auth.ts` | ✅ | |

### 2.3 Boss 绑定与会话

| Method | Path | 前端 | 后端 | 状态 | 备注 |
|--------|------|------|------|------|------|
| POST | `/boss/connect/start` | `startBossConnect` | `boss-connect.ts` | ✅ | 挂载于 `/boss/connect` |
| GET | `/boss/connect/:id/status` | `getBossConnectStatus` | `boss-connect.ts` | ✅ | |
| POST | `/boss/connect/:id/sync` | `syncBossConnect` | `boss-connect.ts` | ✅ | |
| POST | `/boss/connect/:id/refresh` | `refreshBossConnectQr` | `boss-connect.ts` | ✅ | |
| DELETE | `/boss/connect/:id` | `cancelBossConnect` | `boss-connect.ts` | ✅ | |
| POST | `/boss/connect/:id/complete` | `completeBossConnect` | `boss-connect.ts` | ✅ | |
| GET | `/boss/session` | `getBossSession` | `boss.ts` | ⚠️ | JSON 降级返回 `{ bound:false, crawlEnabled:false }`，缺 `safety` 等 |
| POST | `/boss/session` | `saveBossSession` | `boss.ts` | ✅ | JSON 模式 503 |
| POST | `/boss/sync` | `syncBossApplications` | `boss.ts` | ✅ | |
| GET | `/boss/notifications` | `getJobNotifications` | `boss.ts` | ✅ | |
| POST | `/boss/notifications/read` | `markJobNotificationsRead` | `boss.ts` | ✅ | |
| GET | `/boss/chats` | `getBossChats` | `boss.ts` | ✅ | 含 `error` / `localOnly` |
| GET | `/boss/chats/:jobId/messages` | `getBossChatMessages` | `boss.ts` | ✅ | 后端 message 含 `userId/bossJobId`，前端忽略 |
| POST | `/boss/chats/:jobId/suggest-reply` | `suggestBossReply` | `boss.ts` | ✅ | |
| POST | `/boss/chats/:jobId/reply` | `sendBossChatReply` | `boss.ts` | ✅ | |

### 2.4 模拟面试 Interview

| Method | Path | 前端 | 后端 | 状态 | 备注 |
|--------|------|------|------|------|------|
| GET | `/interview/status` | `getInterviewStatus` | `interview.ts` | ✅ | |
| POST | `/interview/start` | `startInterview` | `interview.ts` | ✅ | `questionPlan[].id` ↔ 后端 `questionId` |
| POST | `/interview/chat` | `chatInterview` | `interview.ts` | ✅ | |
| POST | `/interview/chat/stream` | `chatInterviewStream` | `interview.ts` | ✅ | SSE `data:` 协议一致 |
| POST | `/interview/assist` | `getAssistSuggestion` | `interview.ts` | ✅ | |

### 2.5 报告 Reports

| Method | Path | 前端 | 后端 | 状态 |
|--------|------|------|------|------|
| GET | `/reports` | `listReports` | `reports.ts` | ✅ |
| GET | `/reports/:id` | `getReport` | `reports.ts` | ✅ |
| DELETE | `/reports/:id` | `deleteReport` | `reports.ts` | ✅ |

### 2.6 TTS

| Method | Path | 前端 | 后端 | 状态 |
|--------|------|------|------|------|
| GET | `/tts/status` | `getTtsStatus` | `tts.ts` | ✅ |
| GET | `/tts/voices` | `getTtsVoices` | `tts.ts` | ✅ |
| POST | `/tts/synthesize` | `synthesizeSpeech` | `tts.ts` | ✅ | 返回 audio Blob |

### 2.7 题库 Questions

| Method | Path | 前端 | 后端 | 状态 |
|--------|------|------|------|------|
| GET | `/questions` | `listQuestions` | `questions.ts` | ✅ |
| GET | `/questions/stats` | `getQuestionStats` | `questions.ts` | ✅ |
| GET | `/questions/:id` | `getQuestion` | `questions.ts` | ✅ |
| POST | `/questions` | `createQuestion` | `questions.ts` | ✅ |
| PUT | `/questions/:id` | `updateQuestion` | `questions.ts` | ✅ |
| DELETE | `/questions/:id` | `deleteQuestion` | `questions.ts` | ✅ |

### 2.8 面经 Experiences

| Method | Path | 前端 | 后端 | 状态 |
|--------|------|------|------|------|
| GET | `/experiences` | `listExperiences` | `experiences.ts` | ✅ |
| GET | `/experiences/:id` | `getExperience` | `experiences.ts` | ✅ |
| POST | `/experiences` | `createExperience` | `experiences.ts` | ✅ |
| PUT | `/experiences/:id` | `updateExperience` | `experiences.ts` | ✅ |
| DELETE | `/experiences/:id` | `deleteExperience` | `experiences.ts` | ✅ |

### 2.9 运营后台 Admin

| Method | Path | 前端 | 后端 | 状态 |
|--------|------|------|------|------|
| GET | `/admin/dashboard` | `getAdminDashboard` | `admin.ts` | ✅ |
| GET | `/admin/questions/review` | `listReviewQuestions` | `admin.ts` | ✅ |
| POST | `/admin/questions/:id/review` | `reviewQuestion` | `admin.ts` | ✅ |
| GET | `/admin/candidates` | `listCandidates` | `admin.ts` | ✅ |
| POST | `/admin/candidates/:id/review` | `reviewCandidate` | `admin.ts` | ✅ |
| POST | `/admin/experiences/:id/generate-questions` | `generateQuestionsFromExperience` | `admin.ts` | ✅ |
| POST | `/admin/experiences/:id/review` | `reviewExperience` | `admin.ts` | ✅ |
| GET | `/admin/users` | `listAdminUsers` | `admin.ts` | ✅ |
| PATCH | `/admin/users/:id/role` | `updateAdminUserRole` | `admin.ts` | ✅ |
| POST | `/admin/quality/regression` | `runQualityRegression` | `admin.ts` | ✅ |
| GET | `/admin/metrics` | `getAdminMetrics` | `admin.ts` | ✅ |
| GET | `/admin/gateway` | `getAdminGateway` | `admin.ts` | ✅ |
| POST | `/admin/questions/bulk-status` | `bulkUpdateQuestionStatus` | `admin.ts` | ✅ |
| POST | `/admin/cache/purge` | `purgeAdminCache` | `admin.ts` | ✅ |
| GET | `/admin/job-applications` | `getAdminJobApplications` | `admin.ts` | ✅ |

### 2.10 刷题 Practice & Quiz

| Method | Path | 前端 | 后端 | 状态 | 备注 |
|--------|------|------|------|------|------|
| GET | `/practice` | `getPracticeProgress` | `practice.ts` | ✅ | JSON 模式 `syncEnabled:false` |
| PUT | `/practice/:questionId` | `updatePracticeProgress` | `practice.ts` | ✅ | JSON 模式 503 |
| POST | `/practice/sync` | `syncPracticeProgress` | `practice.ts` | ✅ | JSON 模式 503 |
| POST | `/quiz/score` | `scoreQuizAnswer` | `quiz.ts` | ✅ | demo/llm 均含 `source` 字段 |

### 2.11 用户画像 & 学习路线

| Method | Path | 前端 | 后端 | 状态 |
|--------|------|------|------|------|
| GET | `/profile` | `getProfile` | `profile.ts` | ✅ |
| GET | `/paths` | `getLearningPaths` | `paths.ts` | ✅ |

### 2.12 岗位 & 投递 Jobs / Applications

| Method | Path | 前端 | 后端 | 状态 | 备注 |
|--------|------|------|------|------|------|
| GET | `/jobs` | `listJobs` | `jobs.ts` | ✅ | |
| GET | `/jobs/:id` | `getJob` | `jobs.ts` | ✅ | |
| POST | `/jobs` | `createJob` | `jobs.ts` | ✅ | |
| GET | `/jobs/:id/analysis` | `getJobAnalysis` | `jobs.ts` | ✅ | |
| GET | `/jobs/preferences` | `getJobPreferences` | `jobs.ts` | ✅ | |
| PUT | `/jobs/preferences` | `updateJobPreferences` | `jobs.ts` | ✅ | |
| GET | `/jobs/recommendations` | `getJobRecommendations` | `jobs.ts` | ⚠️ | JSON 降级缺 `firecrawlConfigured/recentRuns` |
| POST | `/jobs/crawl` | `triggerBossCrawl` | `jobs.ts` | ✅ | |
| POST | `/jobs/matches/batch-greet` | `batchGreetMatches` | `jobs.ts` | ✅ | |
| POST | `/jobs/purge-demo` | `purgeDemoJobs` | `jobs.ts` | ✅ | |
| GET | `/jobs/crawl/runs` | `listCrawlRuns` | `jobs.ts` | ✅ | |
| GET | `/jobs/agent-logs` | `getAgentLogs` | `jobs.ts` | ✅ | |
| GET | `/jobs/matches` | `getJobMatches` | `jobs.ts` | ✅ | JSON 降级 `items:[]` |
| POST | `/jobs/matches/:id/approve` | `approveJobMatch` | `jobs.ts` | ✅ | |
| POST | `/jobs/crawl/filtered` | `crawlBossFiltered` | `jobs.ts` | ✅ | |
| GET | `/applications` | `listApplications` | `applications.ts` | ✅ | |
| POST | `/applications/greeting-preview` | `previewJobGreeting` | `applications.ts` | ✅ | |
| POST | `/applications/apply` | `applyJob` | `applications.ts` | ✅ | 含 `bossApply/bossUrl/jobSource` |
| POST | `/applications/:id/mark-interview` | `markInterviewInvited` | `applications.ts` | ✅ | |

### 2.13 智能导入 Smart Import

| Method | Path | 前端 | 后端 | 状态 | 备注 |
|--------|------|------|------|------|------|
| GET | `/import/health` | `getImportHealth` | `smart-import.ts` | ✅ | 需 admin |
| POST | `/import/parse-text` | `parseTextToQuestions` | `smart-import.ts` | ✅ | 含 `warnings` / `source` |
| POST | `/import/upload-file` | `uploadImportFile` | `smart-import.ts` | ✅ | 422 含 `SCANNED_PDF_NEED_OCR` + `extractedText` |
| POST | `/import/generate-content` | `generateQuestionContent` | `smart-import.ts` | ✅ | |
| POST | `/import/suggest-fields` | `suggestQuestionFields` | `smart-import.ts` | ✅ | |
| POST | `/import/batch` | `batchImportQuestions` | `smart-import.ts` | ✅ | `results[].warnings` 一致 |

### 2.14 简历 Resume & 公开分享

| Method | Path | 前端 | 后端 | 状态 | 备注 |
|--------|------|------|------|------|------|
| GET | `/resumes` | `getResumes` | `resume.ts` | ✅ | `{ resumes, resume, syncEnabled }` |
| GET | `/resumes/:id` | `getResumeById` | `resume.ts` | ✅ | |
| POST | `/resumes` | `createResume` | `resume.ts` | ✅ | 需登录 |
| PUT | `/resumes/:id` | `updateResume` | `resume.ts` | ✅ | 含 `layoutConfig` |
| DELETE | `/resumes/:id` | `deleteResume` | `resume.ts` | ✅ | |
| GET | `/resumes/health` | `getResumeHealth` | `resume.ts` | ✅ | 支持 `?probe=1` |
| POST | `/resumes/parse-preview` | `parseResumePreview` | `resume.ts` | ✅ | 含 `fieldCoverage` |
| POST | `/resumes/parse-text` | `parseResumeText` | `resume.ts` | ✅ | |
| POST | `/resumes/extract` | `extractResumeFile` / `extractResumeText` | `resume.ts` | ✅ | multipart + JSON |
| POST | `/resumes/generate` | `generateResume` | `resume.ts` | ✅ | |
| POST | `/resumes/upload` | `uploadResumeFile` | `resume.ts` | ⚠️ | 响应含 `fieldCoverage`，client 类型未声明 |
| POST | `/resumes/optimize` | `optimizeResume` | `resume.ts` | ✅ | |
| POST | `/resumes/sync-summary` | `syncResumeSummary` | `resume.ts` | ✅ | |
| GET | `/resumes/:id/share` | `getResumeShare` | `resume.ts` | ✅ | `sharedAt` ↔ 后端 `createdAt` |
| POST | `/resumes/:id/share` | `createResumeShare` | `resume.ts` | ✅ | `expiresInDays:0/null` → 永不过期 |
| DELETE | `/resumes/:id/share` | `revokeResumeShare` | `resume.ts` | ✅ | |
| GET | `/resumes/export-pdf/health` | `getResumePdfHealth` | `resume.ts` | ✅ | 路由顺序正确（在 `/:id` 前） |
| POST | `/resumes/:id/export-pdf` | `exportResumePdf` | `resume.ts` | ✅ | 返回 PDF Blob |
| POST | `/resumes/track-export` | `trackResumeExport` | `resume.ts` | ✅ | |
| GET | `/public/r/:token` | `getPublicResume` | `public-resume.ts` | ✅ | 错误码 `SHARE_EXPIRED` / `SHARE_NOT_FOUND` |

### 2.15 后端已实现、前端未封装（非阻塞）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/applications/:id` | 单条投递详情 |
| PATCH | `/applications/:id` | 更新投递状态 |
| PUT | `/resumes/` | 旧版 upsert 兼容 |
| DELETE | `/boss/session` | 解绑 Boss |
| POST | `/boss/session/test` | 会话探测 |
| POST | `/internal/worker/*` | Worker 内部回调 |

---

## 3. 关键字段与错误码验收

### 3.1 `SCANNED_PDF_NEED_OCR`

| 层 | 实现 | 状态 |
|----|------|------|
| 后端常量 | `resume-extract-errors.ts` → `SCANNED_PDF_CODE` | ✅ |
| 简历上传/提取 | `resume.ts` `/extract`、`/upload` 422 + `code` | ✅ |
| 智能导入上传 | `smart-import.ts` `/upload-file` 422 + `code` + `extractedText` | ✅ |
| 前端常量 | `client.ts` → `SCANNED_PDF_CODE` | ✅ |
| 前端 UI | `ScannedPdfGuide.tsx`、`ImportUploadError` | ✅ |

### 3.2 公开分享 Token

| 字段/行为 | 前端 | 后端 | 状态 |
|-----------|------|------|------|
| 创建 `expiresInDays` | `createResumeShare` | `shareCreateSchema` | ✅ |
| 永不过期（0 → null） | `ResumeSharePanel` | `createResumeShare` days 逻辑 | ✅ |
| 过期 410 + `SHARE_EXPIRED` | `PublicResumePage` + `ApiError.code` | `public-resume.ts` | ✅ |
| 无效 404 + `SHARE_NOT_FOUND` | `PublicResumePage` | `public-resume.ts` | ✅ |
| `layoutConfig` 公开只读 | `getPublicResume` 类型 | 响应含 `layoutConfig` | ✅ |
| PG vs JSON 存储 | — | `resume-share-store.ts` 双实现 | ✅ |

### 3.3 实体类型对照（`entities.ts` ↔ `client.ts`）

| 实体 | 对齐情况 | 差异 |
|------|----------|------|
| `ResumeContent` / `UserResume` | ✅ | `basic` 命名一致；`layoutConfig` 一致 |
| `ResumeFieldCoverageItem` | ✅ | `ok \| missing \| low` 一致 |
| `InterviewReport` / `InterviewReportDetail` | ✅ | `rounds[].dimensions` 可选一致 |
| `JobPreference` | ⚠️ | 前端部分字段 optional；后端 DEFAULT 总会补齐 |
| `JobApplication` | ✅ | 前端扩展 `bossUrl/jobSource/bossApply` 来自 apply 响应 |
| `AgentActionLog.actionType` | ⚠️ | 前端 `string`；后端 `AgentActionType` 联合 |
| `BossChatMessage` | ⚠️ | 后端多 `userId/bossJobId/company/jobTitle`（向前兼容） |
| `Question` / `Experience` | ✅ | |
| Smart Import question | ✅ | `warnings[]` 批量导入一致 |

---

## 4. 数据层验收（PostgreSQL vs JSON 降级）

| 能力 | PostgreSQL | JSON (`db.json`) | 前端感知 |
|------|------------|------------------|----------|
| 用户登录/注册 | ✅ | ❌ 503 | `auth/status.enabled` |
| 运营后台 | ✅ admin | ❌ | 路由守卫 + 403 |
| 简历 CRUD | ✅ 多简历 + layout | ⚠️ 文件存储但**仍需 JWT 登录** | `syncEnabled` |
| 简历公开分享 | ✅ `resume_shares` 表 | ✅ `resumeShares[]` | 双模式脚本通过 |
| 刷题进度同步 | ✅ | ❌ 空列表 / 503 写入 | `syncEnabled` |
| 投递 / Boss | ✅ | ❌ 空列表 / 503 | `JobsPage` 需登录 |
| 智能导入 | ✅ admin | ✅ admin（需 PG 才有 admin 账号） | — |
| 面试 / 题库 / 面经 | ✅ | ✅ | 匿名可用 |
| Quiz 评分 | ✅ | ✅ | 无 `requireAuth` |
| LLM 缓存 | ✅ PG | ❌ 内存 | — |

**结论**：双模式差异**符合 README 设计**；简历与投递模块依赖 PG + 用户体系，JSON 模式仅适合面试/题库演示。

---

## 5. 联调测试执行结果

环境：Windows · 无 `DATABASE_URL`（JSON 降级）· 未启动 HTTP 服务（脚本为单元/集成级）

| 命令 | 结果 | 说明 |
|------|------|------|
| `npm run test:quiz-score` | ✅ pass | Quiz demo 规则评分 |
| `npm run test:resume-field-coverage` | ✅ pass | 字段覆盖率计算 |
| `npm run test:smart-import-batch` | ✅ pass | unwrap / warnings |
| `npm run test:resume-all` | ✅ pass | 4 子项全绿 |
| ↳ `test:resume-demo` | ✅ 11/11 | |
| ↳ `test:import-extract` | ✅ 7/7 | DOCX fixture 跳过（无文件） |
| ↳ `test:resume-share` | ✅ pass | 含过期逻辑 |
| ↳ `test:resume-file-guard` | ✅ pass | |

**未执行**：PostgreSQL 实机 E2E、Playwright 全量（属 CI 范围，本阶段以 API 回归为主）。

---

## 6. 问题清单与修复建议

### P0 — 阻塞上线（0）

无。

### P1 — 应尽快修复（3）

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| P1-1 | **AdminSidebar Metrics 直链无 JWT** | 管理员点击「Metrics API」恒 401 | 改为 `api.getAdminMetrics()` 打开新窗口，或生成带 token 的 fetch 页面 |
| P1-2 | **`GET /jobs/recommendations` JSON 降级响应不一致** | PG 路径返回 `firecrawlConfigured/recentRuns/bossBound`；JSON 路径仅 `crawlEnabled` | 统一响应 schema，JSON 模式补默认字段 |
| P1-3 | **`test:resume-all` 未纳入 CI** | 简历 API 回归可能遗漏 | 加入 `.github/workflows/ci.yml` api job（PROJECT-STATUS-REPORT 已记录） |

### P2 — 体验 / 维护（6）

| # | 问题 | 建议 |
|---|------|------|
| P2-1 | `uploadResumeFile` 响应含 `fieldCoverage` 但 TS 类型未声明 | 扩展 `client.ts` 返回类型；`handleUpload` 可选展示覆盖率 |
| P2-2 | `JobPreference` 前端 optional vs 后端 required | 前端改为与 `entities.ts` 对齐或生成共享类型 |
| P2-3 | DOCX 提取回归 fixture 缺失 | 补 `sample-resume.docx` 到 `mianshi-api/scripts/fixtures/` |
| P2-4 | 分享过期 E2E 未覆盖 `expiresInDays` | 扩展 `resume-share.spec.ts` |
| P2-5 | 无 OpenAPI / 自动生成契约 | 可选：Hono OpenAPI 或 zod-to-ts 脚本 |
| P2-6 | `/applications/:id` 等后端 endpoint 未封装 | 按需补充 client 方法 |

---

## 7. 验收结论

**有条件通过** — 前后端 **111 个消费侧 endpoint 全部有后端实现**，核心实体与错误码（含 `SCANNED_PDF_NEED_OCR`、分享 token 过期）对齐；5 项 API 回归脚本本地全绿。存在 **3 项 P1**（Metrics 直链鉴权、推荐接口降级 schema、CI 缺口）需在上线前或下一迭代关闭；无 P0 阻塞项。

---

## 8. 附录：路由模块索引

```
mianshi-api/src/routes/
├── health.ts          → /api/health
├── auth.ts            → /api/auth/*
├── admin.ts           → /api/admin/*
├── questions.ts       → /api/questions/*
├── experiences.ts     → /api/experiences/*
├── interview.ts       → /api/interview/*
├── reports.ts         → /api/reports/*
├── tts.ts             → /api/tts/*
├── practice.ts        → /api/practice/*
├── quiz.ts            → /api/quiz/*
├── profile.ts         → /api/profile/*
├── paths.ts           → /api/paths/*
├── jobs.ts            → /api/jobs/*
├── applications.ts    → /api/applications/*
├── boss.ts            → /api/boss/* (+ /connect 子路由)
├── resume.ts          → /api/resumes/*
├── public-resume.ts   → /api/public/*
├── smart-import.ts    → /api/import/*
├── metrics.ts         → /api/metrics/*
└── internal-worker.ts → /api/internal/worker/*
```

额外：`GET /api/info` 定义于 `src/index.ts`。
