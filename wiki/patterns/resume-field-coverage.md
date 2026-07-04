# Resume Field Coverage

> 简历 AI 解析后，用规则检测各字段 ok/missing/low，在对照 UI 标注低置信度，让用户知道「丢了什么」。

## Problem Context

- PDF/DOCX 导入经 extract → parse 后，用户看不到哪些字段未识别或用了占位值
- LLM/Demo 解析可能填「候选人」「某科技公司」等模板值
- 用户期望 1:1 复制，实际为「智能识别 + 重新排版」

## Solution

### 1. 后端 `computeResumeFieldCoverage`

```typescript
type FieldCoverageStatus = 'ok' | 'missing' | 'low'

// 检测：姓名、职位、联系方式、简介、教育、经历、项目、技能等
// 规则：占位名、demo 默认职位、模板公司名、简介过短 → low
```

- 输入：`ResumeContent` + 可选 `source: 'llm' | 'demo'`
- 输出：`ResumeFieldCoverageItem[]` 含 `key`、`label`、`status`、`hint`

### 2. API 集成

- `POST /parse-text` 返回结构化 content + fieldCoverage + source
- 单元测试：`test:resume-field-coverage` 进 CI

### 3. 前端对照 UI

- `ImportParseCompareModal` / `ImportWizard` 第三步：左侧原文摘要，右侧字段树
- 字段旁 badge：未识别 / 低置信度
- Admin 导入：`AdminImportPage` field warnings + AI 补全缺项

### 4. 与导入向导配合

```
上传 → extract（原文可编辑）→ parse-text → 对照确认 → 应用至编辑页
```

## Trade-offs

| 得 | 失 |
|----|-----|
| 内容可追溯，管理用户预期 | 规则无法覆盖所有 LLM 幻觉 |
| 无 LLM 也可标注 demo 占位 | 需维护 PLACEHOLDER 规则集 |
| CI 可测 | 不能替代人工核对关键字段 |

## Related Pages

- [[patterns/llm-gateway-demo-fallback]]
- [[concepts/ai-job-prep-platform]]

## Sources

- `mianshi-api/src/services/resume-field-coverage.ts`
- `mianshi-frontend/src/components/resume/ImportParseCompareModal.tsx`
- `docs/RESUME-LAUNCH-PLAN.md`: §4.4 导入解析 P0 交付标准
- `docs/10-复盘沉淀/RETROSPECTIVE.md`: §2.3 三步向导决策
