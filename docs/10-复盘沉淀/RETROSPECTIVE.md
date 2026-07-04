# mianshi 项目复盘报告

> **阶段**：10 · 复盘沉淀  
> **日期**：2026-07-03  
> **范围**：mianshi-api · mianshi-frontend · mianshi-worker · deploy  
> **依据**：[PROJECT-STATUS-REPORT.md](../PROJECT-STATUS-REPORT.md) · [RESUME-LAUNCH-PLAN.md](../RESUME-LAUNCH-PLAN.md) · [QUALITY_REPORT.md](../QUALITY_REPORT.md) · [BOSS_WORKER_ARCHITECTURE.md](../BOSS_WORKER_ARCHITECTURE.md)

---

## 1. 项目定位与当前成熟度

### 1.1 定位

**mianshi（Offer通 / iume）** 是一个 **AI 求职备战平台**，覆盖：

| 域 | 能力 |
|----|------|
| 面试 | 模拟面试、Rubric 评分、追问、报告 |
| 学习 | 题库、刷题、学习路线 |
| 内容 | 面经 UGC、智能导入、运营审核 |
| 简历 | 生成 · 导入向导 · 排版 · 导出 · 公开分享 |
| 投递 | Boss 绑定 + Worker 自动化（内测） |

**产品一句话**：用 AI 帮求职者「练面试、刷题、写简历、投岗位」——不是单点工具，而是备战闭环。

### 1.2 成熟度评分

| 维度 | 得分 | 说明 |
|------|------|------|
| **平台整体** | **8.2/10** | P0/P1 完成；CD 脚手架 + chunk 拆分落地 |
| 简历模块 | ~92% | 主链路可内测/种子用户 |
| Boss 投递 | ~70% | 架构完整；Worker 未纳入 prod CD |
| 生产就绪 | ~55% | CI 全绿；GitHub Secrets 待配置 |
| 代码质量 | ~85% | Golden Set 90 组 + 9 套 E2E |

**阶段判断**：功能开发 Phase 1～2 **基本完成** → 进入 **运维上线 + polish**。

### 1.3 代码库规模（快照）

- API 路由 21 模块 · ~87 TS 源文件
- 前端 ~193 TS/TSX · Admin 11 页 · 40+ lazy 路由
- Worker ~23 Python（Playwright + APScheduler）
- 测试：Golden Set 90 组 · E2E 9 specs / 20 用例 · API 回归脚本 10 个

---

## 2. 做对了什么（Top 5 技术/产品决策）

### 2.1 质量从 Prompt 抽离 → Golden Set + Rubric 回归

**决策**：面试评分不依赖 LLM 自由发挥，改为 `keyPoints` 规则分 + Rubric 四维融合，并用 **Golden Set 90 组**（30 题 × 3 档）做 CI 回归。

**价值**：评分可度量、可审核、可回归；Demo 模式禁用随机分，避免「假高分」误导用户。

**证据**：`quality-regression.ts`、`scoring.ts`、`data/golden-set.json`、CI `quality:regression`。

### 2.2 LLM Gateway 统一网关 + 显式 Demo 降级

**决策**：所有 LLM 调用经 `llm-gateway.ts`；无 Key / 调用失败时走规则 Demo，且 **响应带 `source: 'demo'` + 前端强确认弹窗**。

**价值**：开发/演示环境可跑通全链路；生产与 Demo 行为可区分；`?probe=1` 健康探测避免「配置了 Key 但不可达」的静默失败。

**证据**：`llm-gateway.ts`、`ResumeProvider.tsx`、`AdminImportPage.tsx`。

### 2.3 简历导入「三步向导 + fieldCoverage 对照」

**决策**：拆分 `extract`（仅抽文本）与 `parse-text`（AI 结构化）；用户先确认原文，再对照字段树应用；低置信度字段 UI 标注。

**价值**：管理用户预期（「智能识别，重新排版」而非 1:1 复制）；内容可追溯；商业对标老鱼/超级简历的导入体验。

**证据**：`ImportWizard.tsx`、`ImportParseCompareModal.tsx`、`resume-field-coverage.ts`。

### 2.4 每份简历 layout 存 DB（非 localStorage）

**决策**：`sectionOrder` / `previewSettings` 写入 resume 级 `layoutConfig`，分享快照同步 layout。

**价值**：多设备一致；公开分享页与编辑预览一致；避免 localStorage 丢失导致排版错乱。

**证据**：`resumeLayoutConfig.ts`、`useResumeAutoSave`、`resume-share-store.ts`。

### 2.5 前端性能：lazy 路由 + manualChunks

**决策**：40+ 页 `lazyPages.ts` 按需加载；Vite `manualChunks` 拆 vendor-react / icons / canvas；CI `check:bundles` 预算 ≤350 KB。

**价值**：入口 chunk 从 **1072 KB → 65 KB**，首屏与移动端体验显著改善。

**证据**：`lazyPages.ts`、`vite.config.ts`、`check-bundle-size.mjs`。

---

## 3. 踩坑与教训（Top 5）

### 3.1 LLM 降级：静默 Demo → 用户信任危机

**坑**：早期无 `LLM_API_KEY` 时，导入/生成/优化 **静默返回规则假数据**，用户以为 AI 已识别。

**教训**：
- 所有 AI 路径必须返回 `source: 'llm' | 'demo'`
- Demo 必须 **显式用户确认**（弹窗 + Banner）
- 生产环境 `LLM_API_KEY` 必填；`LLM_FORCE_DEMO` 仅 dev

**现状**：P0 已全部修复；`probeLlmReachable` 多端点探测。

### 3.2 PDF 解析：纯文本丢版式 → 字段错位

**坑**：`pdf-parse` 只出纯文本，双栏 PDF 块顺序乱 → LLM 填错模块；用户期望 1:1 复制。

**教训**：
- 产品文案统一：**智能识别 + 重新排版**，不承诺像素级还原
- 三步向导让用户在对照页修正
- pdf.js Y 坐标块排序仍为 **未完成 PoC**（P2）

**现状**：扫描 PDF 有 `SCANNED_PDF_NEED_OCR` + `ScannedPdfGuide` 引导粘贴。

### 3.3 Chunk 拆分：首包 1MB+ 拖垮移动端

**坑**：初期单 bundle 含 html2canvas、lucide、全站路由，首屏加载 >3s。

**教训**：
- 大依赖（canvas、icons）必须 manualChunks
- 路由级 lazy 是 SPA 标配
- CI 加 bundle 预算，防止回归

**现状**：入口 65 KB；`check:bundles` 进 CI。

### 3.4 Boss Worker：架构完整但未纳入 prod CD

**坑**：Worker 独立 Python 进程 + Playwright Persistent Context，与 API compose 分离；生产 compose 未含 worker → Boss 自动化 **部署即不可用**。

**教训**：
- 可选子系统也要在文档中明确「如何 prod 部署」
- Cookie 绑定 + NEED_REBIND 状态机复杂，需运维手册
- 反爬与 Session 过期是常态，非全自动

**现状**：~70% 完成；内测可用；prod 需单独部署或 compose 扩展。

### 3.5 测试债务：`test:resume-all` 未进 CI

**坑**：简历 API 4 项回归脚本存在，但未接入 `ci.yml`，合并后可能遗漏回归。

**教训**：本地聚合脚本 ≠ CI 门禁；关键模块回归必须进 pipeline。

**建议**：上线前将 `test:resume-all` 加入 api job（P0）。

---

## 4. 未完成项与下一迭代建议

### P0 — 上线阻塞（1～3 天）

| 项 | 说明 | 负责域 |
|----|------|--------|
| 配置 GitHub Secrets | 5 项 Secret + 服务器 `deploy/.env` | deploy |
| 首次 prod 部署验证 | `/api/health` + LLM probe | ops |
| CI 加入 `test:resume-all` | 简历 API 4 项回归 | ci |

### P1 — 体验 polish（1～2 周）

| 项 | 说明 |
|----|------|
| 分享过期 E2E | `resume-share.spec.ts` 未测 expiresInDays |
| DOCX fixture 回归 | Phase 2 测试项未完成 |
| M10 投递摘要 UI | sync-summary API 有，岗位页卡片弱 |
| 更新 QUALITY_REPORT §2 | 对齐当前架构态（仍为 Phase 3 前基线） |

### P2 — 增强（2～4 周）

| 项 | 说明 |
|----|------|
| Worker prod 部署 | compose 扩展或独立服务文档 |
| APM / LLM 错误率告警 | P3 未做 |
| pdf.js 块排序 PoC | 改善双栏 PDF 乱序 |
| 模板市场 / 分享密码 | 商业增强 |
| 多页 PDF edge case | 服务端 PDF 稳定性 |

---

## 5. 可复用模式清单

| 模式 | 问题 | 做法 | 参考 |
|------|------|------|------|
| **Golden Set 回归** | LLM/规则评分漂移 | 标准答案集 + min/max 断言进 CI | `golden-set.json`、`quality-regression.ts` |
| **Demo 降级 + 强确认** | 无 Key 时静默假数据 | `source` 字段 + 弹窗 + probe | `llm-gateway.ts`、[[patterns/llm-gateway-demo-fallback]] |
| **field coverage UI** | 导入后用户不知丢字段 | 规则检测 ok/missing/low + 对照页 | `resume-field-coverage.ts` |
| **layout 隔离** | 多简历排版互串 | resume 级 `layoutConfig` 存 DB | `resumeLayoutConfig.ts` |
| **extract / parse 拆分** | 上传即 parse 不可追溯 | 先原文预览，再 AI 结构化 | `ImportWizard.tsx` |
| **frontend chunk 拆分** | 首包过大 | lazy 路由 + manualChunks + CI 预算 | `lazyPages.ts`、`vite.config.ts` |
| **题库驱动面试** | LLM 自由出题不可控 | questionPlan + published 题 + Rubric | `question-selector.ts`、`interview.ts` |
| **PG 优先 / JSON 降级** | 本地开发零配置 | `DATABASE_URL` 可选，自动 fallback | `db/client.ts` |
| **CD Secrets 校验** | 缺 Secret 静默失败 | validate-secrets job + 文档 | `cd.yml`、`GITHUB-SECRETS.md` |
| **Boss NEED_REBIND 状态机** | Session 过期无感知 | active ↔ need_rebind + Webhook | `BOSS_WORKER_ARCHITECTURE.md` |

详细模式页见 [wiki/patterns/](../../wiki/patterns/)。

---

## 6. 若再做类似项目，会改变什么

1. **Day 1 定质量门禁**：Golden Set / 关键 API 回归进 CI，不等「功能做完再加测试」。
2. **AI 路径 Day 1 带 `source`**：Demo 降级与强确认是产品信任基础，不是后期补丁。
3. **导入类功能先拆 extract/parse**：避免 upload 一步完成导致无法对照、无法修正。
4. **可选子系统（Worker）与主 compose 同文档**：部署拓扑在架构阶段写清，避免「代码完成但 prod 不可用」。
5. **bundle 预算进 CI 首日**：大 SPA 不 lazy 必爆；65 KB vs 1072 KB 的差距应在第一个 sprint 解决。

---

## 7. 文档与知识沉淀

| 产出 | 路径 |
|------|------|
| 本复盘 | `docs/10-复盘沉淀/RETROSPECTIVE.md` |
| Wiki 索引 | `wiki/index.md` |
| 工程模式 | `wiki/patterns/`（3+ 篇） |
| 概念页 | `wiki/concepts/`（2+ 篇） |
| 操作日志 | `wiki/log.md` |

---

*维护：每 major 里程碑或上线后更新本节与 wiki 交叉引用。*
