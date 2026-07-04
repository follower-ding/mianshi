# AI 求职备战平台

> 用 AI 串联「练面试、刷题、写简历、投岗位」的闭环求职产品，而非单点工具。

## Key Points

1. **四域一体**：模拟面试（Rubric 评分 + 追问）、题库/路线、简历工作台、Boss 智能投递构成完整备战链路。
2. **质量可度量**：面试评分从 Prompt 抽离为 Golden Set 回归 + 题库驱动抽题，而非 LLM 自由发挥。
3. **AI 诚实降级**：无 LLM Key 或调用失败时走 Demo 规则，但必须 `source: 'demo'` + 用户确认，避免静默假数据。
4. **运营可治理**：Admin 后台支持题库审核、智能导入、面经→候选题、质量看板。
5. **分层部署**：API + Frontend 为主路径；Worker（Playwright）为可选子系统，需独立部署文档。

## Details

### 模块矩阵

| 模块 | 完成度 | 核心能力 |
|------|--------|----------|
| 模拟面试 | ~92% | 流式对话、题库 questionPlan、报告雷达图 |
| 题库 + 刷题 | ~88% | 审核流、去重、Golden Set、Quiz demo 降级 |
| 面经 UGC | ~85% | CRUD、审核、候选题生成 |
| 简历工作台 | ~92% | 导入向导、fieldCoverage、导出、公开分享 |
| Boss 投递 | ~70% | Cookie 绑定、Worker 定时打工、NEED_REBIND |
| 生产 CD | 脚手架 100% | GHCR + SSH；Secrets 待配置 |

### 技术栈

- **前端**：React 19 + Vite 8 + Tailwind 4 + lazy 路由
- **后端**：Hono + PostgreSQL（JSON 降级）+ JWT + LLM Gateway
- **Worker**：Python + Playwright + APScheduler
- **质量**：Golden Set 90 组 · Playwright E2E 9 specs · CI 全链路

### 产品定位句（简历）

> 「上传或描述自己，AI 帮你结构化内容并在专业模板上排版——不是 PDF 像素级复制，而是可编辑、可优化、可导出的智能简历。」

## Context

mianshi 参考 [面多多](https://ai.mianshiya.com/) 打造，目标用户为求职中的开发者/白领。平台整体成熟度 **8.2/10**（2026-06-23），处于功能基本完成、待运维上线阶段。

## Related Pages

- [[concepts/golden-set-regression]]
- [[patterns/llm-gateway-demo-fallback]]
- [[patterns/resume-field-coverage]]
- [[patterns/frontend-chunk-split]]

## Sources

- `docs/PROJECT-STATUS-REPORT.md`: 执行摘要、模块矩阵
- `README.md`: 功能列表、技术栈
- `docs/RESUME-LAUNCH-PLAN.md`: 简历产品定位句
