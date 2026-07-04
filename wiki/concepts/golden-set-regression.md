# Golden Set 回归

> 用预置标准答案集对规则/混合评分引擎做批量断言，使「质量」可 CI 回归而非依赖人工抽检。

## Key Points

1. **固定输入输出对**：每题含 `keyPoints[]` 与多档答案（如 weak/medium/strong），每档有 `min`/`max` 分数区间。
2. **规则引擎优先**：`scoreByKeyPoints` 基于要点命中计分，不调用 LLM，保证 CI 稳定、零成本。
3. **规模可扩展**：当前 30 题 × 3 档 = **90 组**断言，随题库增长可追加 case。
4. **CI 门禁**：`npm run quality:regression` 在 `ci.yml` api job 中执行，失败即阻断合并。
5. **与 LLM 评分互补**：线上可用 Rubric + LLM 微调；Golden Set 锚定规则分底线，防止 Demo 随机分或 Prompt 漂移。

## Details

### 数据结构（简化）

```typescript
type GoldenCase = {
  id: string
  question: string
  keyPoints: string[]
  answers: Record<string, { text: string; min: number; max: number }>
}
```

### 执行流程

```
golden-set.json → quality-regression.ts → scoreByKeyPoints → 断言 min/max → exit 1 if fail
```

### 质量指标（目标）

| 指标 | 含义 |
|------|------|
| Scoring Consistency | 同答同分，回归集方差 σ < 2 |
| Coverage | 每轮面试 ≥3 类考点 |
| Session Completion | 正常结束率 > 95% |

### 历史演进

- **Phase 1 前**：Demo 模式 `scoreDelta = Math.random()`，评分无意义
- **Phase 1 后**：禁用随机分，改为 Rubric + keyPoints；Golden Set 30 组入库
- **当前**：扩展至 90 组；与面试 questionPlan、运营审核流联动

## Context

源自 `docs/QUALITY_REPORT.md` 提出的「质量保障层」——把质量从 Prompt 里抽出来。是 mianshi 面试模块最核心的工程纪律之一。

## Related Pages

- [[concepts/ai-job-prep-platform]]
- [[patterns/llm-gateway-demo-fallback]]

## Sources

- `docs/QUALITY_REPORT.md`: §五 评分引擎、§七 Phase 1
- `mianshi-api/scripts/quality-regression.ts`
- `mianshi-api/data/golden-set.json`
- `docs/PROJECT-STATUS-REPORT.md`: CI 测试矩阵
