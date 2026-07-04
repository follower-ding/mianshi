# Code Review — mianshi 阶段 8

**审查日期**: 2026-07-03  
**审查模式**: review-only（无业务代码修改）  
**Preflight**: 仓库位于 `D:/cursor_project`，**尚无 commit**，`git diff` 为空；本次对全库关键模块做基线审查  
**范围**: `mianshi-api/src/`、`mianshi-frontend/src/`、`deploy/`、`.github/workflows/`（约 281 个 TS/TSX 源文件 + 部署/CI 配置）

---

## Code Review Summary

**Files reviewed**: 关键模块 18 文件深度抽查 + 全库安全/架构 grep 扫描  
**Overall assessment**: **REQUEST_CHANGES**

**Safe to merge?** **需修复后合并** — 无 P0 阻塞项，但存在 **4 项 P1**（公开页 XSS、默认管理员凭据、JWT 角色陈旧、PDF 导出 HTML 注入面），建议在上线前至少修复 P1 #1 与 #2。

---

## Findings

### P0 - Critical

（无）

已覆盖：JWT 算法（HS256 + jose）、SQL 参数化（postgres.js tagged template）、分享 token 熵（`randomBytes(16)` = 128 bit）、smart-import 管理员鉴权、文件大小上限、LLM key 未出现在前端 bundle。

---

### P1 - High

1. **[mianshi-frontend/src/components/resume/ProMinimalPreview.tsx:105,231,301]** 公开简历页 Stored XSS
   - **问题**: `selfIntro`、`experience.detail`、`customSections.body` 在含 `<` 时通过 `dangerouslySetInnerHTML` 渲染；`sanitizeResumeContent` 仅 trim/归一化 skills，**不剥离 HTML/脚本**。`ResumeRichTextEditor` 为 contentEditable，用户可粘贴任意 HTML。公开分享页 `/r/:token` 对访客执行未消毒 HTML。
   - **影响**: 恶意用户创建简历 → 生成分享链接 → 访客浏览器执行脚本（窃取 cookie/localStorage、钓鱼）。nginx 未配置 CSP（见 `deploy/nginx.conf`）。
   - **建议**: 引入 DOMPurify（或服务端 sanitize-html）白名单标签；公开页禁止 raw HTML，统一 `richTextToPlain` + 安全渲染；nginx 增加 `Content-Security-Policy`。

::code-comment{file="mianshi-frontend/src/components/resume/ProMinimalPreview.tsx" line="105" severity="P1"}
公开分享页使用 dangerouslySetInnerHTML 渲染用户 HTML，sanitizeResumeContent 未消毒，存在 Stored XSS。建议 DOMPurify 白名单或公开页仅渲染纯文本。
::

2. **[mianshi-api/src/services/auth.ts:92-107]** 生产环境默认管理员凭据
   - **问题**: `ensureAdminUser()` 在 PG 模式下若不存在 admin 则创建，默认 `ADMIN_PASSWORD ?? 'admin123456'`。CI E2E 亦使用该密码（`.github/workflows/ci.yml:112`）。
   - **影响**: 生产未显式设置 `ADMIN_PASSWORD` 时，攻击者可登录 admin 并访问 `/api/import/*`、题库管理等全部后台能力。
   - **建议**: 生产启动时若 `ADMIN_PASSWORD` 未设置则 **拒绝启动**；或首次启动强制随机密码并打印一次性 token；文档强调 `deploy/.env` 必配项。

3. **[mianshi-api/src/services/auth.ts:42-54]** JWT 角色未与数据库同步
   - **问题**: `verifyToken` 直接从 JWT payload 读取 `role`，不查 DB。管理员被降权后，旧 token（TTL 7d）仍具 admin 权限。
   - **影响**: 权限撤销延迟最长 7 天；违反最小权限与即时撤销预期。
   - **建议**: `requireAdmin` 路径增加 `getAuthUserById(sub)` 校验当前 role；或缩短 admin token TTL + refresh 机制。

4. **[mianshi-api/src/services/resume-pdf.ts:16-36]** 用户可控 HTML 传入 Playwright
   - **问题**: `POST /resumes/:id/export-pdf` 将客户端提交的 `html` 直接 `page.setContent(html)`，无 sandbox/URL 过滤。
   - **影响**: 已认证用户可构造含内网 URL、meta refresh、大型 payload 的 HTML，触发 SSRF 探测或 Playwright 资源耗尽（DoS）。
   - **建议**: 仅允许服务端根据 resume JSON 生成 HTML；若必须客户端 HTML，使用 `page.setContent` + `bypassCSP` 禁用网络、`route.abort()` 拦截外部请求，并限制 HTML 大小。

---

### P2 - Medium

5. **[mianshi-api/src/index.ts:69-79]** `/api/info` 无鉴权信息泄露
   - 暴露 LLM `provider`、`model`、`baseURL`（含 custom endpoint 线索）。建议生产降级为 `configured: boolean` 或需登录访问。

6. **[mianshi-api/src/routes/metrics.ts:7-12]** 指标接口仅 `requireAuth`，非 admin
   - 任意登录用户可读 `/api/metrics?detailed=1`（面试/导入等业务计数）。应改为 `requireAdmin` 或移除 sidebar 直连（`AdminSidebar.tsx:222` 链接且无 Bearer，实际 401）。

7. **[mianshi-api/src/services/llm-gateway.ts:17-18,97-101]** LLM 内存缓存无上限
   - `memoryCache` Map 仅 TTL 惰性过期，高并发/多样 prompt 下内存持续增长。建议 LRU + `LLM_CACHE_MAX_ENTRIES` 或定期 sweep。

8. **[mianshi-api/src/services/question-quality.ts:28-40]** 批量导入 N×全表扫描
   - `findDuplicateQuestion` 每次 `listQuestions()` 全量加载 + O(n) 相似度。50 题 batch 可触发明显延迟。建议 DB 侧 title 索引 + 候选集预过滤。

9. **[mianshi-api/src/index.ts:81-96]** 全局错误处理泄露内部消息
   - `c.json({ error: err.message })` 可能将 DB/LLM 原始错误返回客户端。应对 500 使用泛化文案，细节仅写日志。

10. **[deploy/nginx.conf]** 缺少安全响应头
    - 无 `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Content-Security-Policy`。公开简历页风险叠加。

11. **[mianshi-api/src/routes/smart-import.ts:350-364 vs smart-import-batch.ts:22-31]** 上传格式校验不一致
    - `validateImportUpload` 仅允许 `pdf,txt,md,markdown`；路由内仍有 `docx/doc` 分支（不可达 dead code）。与 `AdminImportPage` accept 一致，但维护易混淆。

12. **[mianshi-api/src/middleware/resume-rate-limit.ts:4-26]** 进程内 rate limit
    - 多实例/滚动部署下限额不共享；`x-forwarded-for` 可伪造。生产建议 Redis 或网关层限流。

13. **[.github/workflows/ci.yml]** 未集成 `scripts/check-secrets.ps1`
    - 本地 push 脚本有 secrets 扫描，CI 无等价步骤。建议在 `api` job 增加 secrets guard（Linux 可用 ripgrep 版）。

14. **[mianshi-api/src/routes/public-resume.ts:12-29]** 公开分享无 rate limit
    - 128-bit token 枚举不可行，但无滥用防护；可加速度限制与 audit log。

---

### P3 - Low

15. **[mianshi-frontend/src/pages/admin/AdminImportPage.tsx]** 989 行 God Component（SRP）
    - 粘贴/上传/快速录入/AI 补全/批量入库/UI 状态同文件。建议拆 `useImportQuestions` hook + 子面板组件。

16. **[mianshi-api/src/services/resume-extract.ts:88]** 重复导出别名
    - `SCANNED_PDF_HINT` 与 `SCANNED_PDF_MESSAGE` 同值，可保留单一导出。

17. **[mianshi-api/src/routes/internal-worker.ts:10-15]** 误导性安全日志
    - `WORKER_KEY` 未设置时实际返回 401（非开放），日志写 "UNPROTECTED" 不准确。应改为 "disabled"。

18. **[mianshi-frontend/src/pages/admin/AdminImportPage.tsx:311-338]** enrichSelected 串行 LLM 调用
    - N 题补全 N 次往返。可 `Promise.all` 限并发（如 3）缩短等待。

19. **[mianshi-api/src/services/llm-gateway.ts:138-156]** 流式接口 bypass 缓存
    - 设计合理；文档注明 stream 不参与 cache 即可。

---

## 模块深度抽查

### AdminImportPage.tsx + smart-import 后端

| 项 | 结论 |
|----|------|
| 鉴权 | ✅ `authMiddleware` + 每路由 `requireAdmin` |
| 输入校验 | ✅ Zod schema（文本 50–50k、batch ≤50 题） |
| 文件上传 | ✅ 10MB 上限、扩展名白名单；magic-byte 在 resume 路径有，import 路径仅扩展名 |
| Demo 降级 | ✅ LLM 失败 → `demoParseTextToQuestions`，前端 `confirmDemoIfNeeded` + toast |
| 错误处理 | ⚠️ `parse-text` catch 泛化 502，丢失细节；upload 422 返回 `extractedText` 片段（仅 admin） |
| 架构 | ⚠️ 前后端均重复 `computeQuestionWarnings` 逻辑 |

### resume-extract.ts + ImportWizard

| 项 | 结论 |
|----|------|
| PDF 双栏排序 | ✅ pdf.js 坐标排序 + pdf-parse fallback |
| 扫描版检测 | ✅ `<30` 字符 → `SCANNED_PDF_CODE` |
| DOCX | ✅ mammoth；`.doc` 明确拒绝 |
| 前端 UX | ✅ 三步 wizard、8s slow hint、ScannedPdfGuide、大小校验与 API 常量一致 |
| 格式一致性 | ⚠️ ImportWizard accept 含 `.docx`，ResumeOptimizePanel 不含（resume API 支持 docx） |

### llm-gateway.ts

| 项 | 结论 |
|----|------|
| Key 管理 | ✅ 仅服务端 env，未 log key |
| 缓存 | ✅ SHA256 key + PG 持久化 + TTL；⚠️ 内存无上限 |
| A/B variant | ✅ 加权随机 + suffix |
| 降级 | ✅ `tryGatewayCompleteChat` catch → null |
| 超时 | ✅ `probeLlmReachable` 8s race；常规 complete 无显式 timeout（依赖 OpenAI client 默认） |

### public-resume / resume-share-store

| 项 | 结论 |
|----|------|
| Token 强度 | ✅ 128-bit hex |
| 过期 | ✅ `expiresAt` 检查（public 路由 + store） |
| 授权 | ✅ 创建/撤销需 resume owner；公开只读无 PII  beyond 简历内容 |
| IDOR | ✅ `getResumeById(user.id, resumeId)` 绑定用户 |
| 撤销 | ✅ DELETE share + DB CASCADE |
| 快照 | ⚠️ 分享时复制 content 快照，后续编辑不自动同步（产品设计，非 bug） |

### deploy/cd.yml + secrets 脚本

| 项 | 结论 |
|----|------|
| CD secrets 校验 | ✅ `validate-secrets` job，缺失则 skip deploy 仍 publish 镜像 |
| SSH deploy | ✅ appleboy/ssh-action + health curl |
| 本地 guard | ✅ `check-secrets.ps1` 阻止 staged .env / sk- / ghp_ 模式 |
| 远程验证 | ✅ `verify-github-secrets.ps1` 通过 gh CLI |
| 缺口 | ⚠️ CI 未调用 check-secrets；cd.yml 无 `secrets-guard` 等价物 |
| 镜像 tag | ✅ sha + latest 双 tag |

---

## SOLID + 架构

| 原则 | 观察 |
|------|------|
| **SRP** | `AdminImportPage.tsx`、`smart-import.ts`（路由+prompt+映射）职责偏多；`resume-optimize.ts` 聚合 extract/parse/optimize/generate |
| **OCP** | LLM gateway 的 variant/cache 扩展点清晰；题目导入格式新增需改多处 schema |
| **DIP** | store/llm 抽象合理；路由层直接依赖具体 service 函数（可接受规模） |
| **耦合** | smart-import 复用 `resume-optimize.extractTextFromFile` → `resume-extract`，依赖链清晰 |

---

## Removal / Iteration Plan

### Safe to Remove Now

| Item | Location | Rationale |
|------|----------|-----------|
| smart-import docx/doc 分支 | `smart-import.ts:350-351` | `validateImportUpload` 已拒绝，不可达 |
| `SCANNED_PDF_MESSAGE` 别名 | `resume-extract.ts:88` | 与 `SCANNED_PDF_HINT` 重复 |

### Defer Removal (Plan Required)

| Item | Why defer | Plan |
|------|-----------|------|
| JSON file DB 路径 | 本地 dev 仍可用 | PG 稳定后文档标记 deprecated，E2E 仅 PG |
| demo 规则解析器 | LLM 不可用时的产品承诺 | 保留；metrics 区分 demo/llm 已具备 |

---

## Security Checklist Coverage

| 类别 | 状态 | 备注 |
|------|------|------|
| XSS | ❌ | 公开简历 HTML 未消毒 |
| SQL Injection | ✅ | 参数化查询 |
| AuthZ | ⚠️ | Admin JWT 角色陈旧；metrics 过宽 |
| JWT | ⚠️ | HS256 + exp 有效；无 iss/aud（单租户可接受） |
| Secrets in repo | ✅ | .env.example 占位；check-secrets 脚本 |
| File upload | ✅ | 大小/扩展名/magic-byte（resume） |
| SSRF | ⚠️ | PDF export Playwright |
| Share token | ✅ | 高熵 + 过期 |
| CORS | ✅ | 可配置单 origin |
| Rate limit | ⚠️ | 仅 resume heavy；内存级 |
| Race/TOCTOU | ✅ | share 创建先删后插；无金融级并发 |

---

## Recommendations（优先级排序）

1. **P1**: 公开简历 HTML 消毒 + nginx CSP（阻塞公开分享上线）
2. **P1**: 生产强制 `ADMIN_PASSWORD` 或启动拒绝默认凭据
3. **P1**: `requireAdmin` 查 DB 当前 role
4. **P1**: PDF 导出改为服务端渲染或 sandbox Playwright
5. **P2**: metrics 限 admin；LLM cache LRU；duplicate 查询优化
6. **P2**: CI 集成 secrets 扫描
7. **P3**: 拆分 AdminImportPage；清理 dead code

---

## 未覆盖 / 残余风险

- 未运行完整 CI/E2E（审查环境未启动服务）
- 未审计 npm 依赖 CVE（建议 `npm audit` 纳入 CI）
- Boss Worker cookie 加密（`boss-crypto.ts`）未做密码学深度审查
- 未验证 PostgreSQL migration 在生产的数据迁移回滚

---

## Next Steps

发现 **19** 项（P0: 0, P1: 4, P2: 10, P3: 5）。

**建议主 Agent 下一步**：

1. **Fix P1 only** — 优先 XSS + 默认 admin + JWT role + PDF sandbox
2. **Fix specific** — 按上表编号选择性修复
3. **No changes** — 文档化已知风险，上线前 checklist 确认

---

*审查 Skill: code-review-expert · Checklists: solid, security, code-quality, removal-plan*
