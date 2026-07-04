# LLM Gateway + Demo 降级

> 统一 LLM 调用入口，无 Key 或失败时走规则 Demo，且必须显式告知用户（`source` + 确认弹窗）。

## Problem Context

- 开发/演示环境常无 `LLM_API_KEY`，但产品需跑通全链路
- 早期静默 Demo 返回假数据，用户误以为 AI 已识别 → **信任危机**
- 「配置了 Key」≠「调用成功」（网络、配额、超时）

## Solution

### 1. 统一网关 `llm-gateway.ts`

- 所有 LLM 调用经 `gatewayCompleteChat` / `tryGatewayCompleteChat`
- 能力：响应缓存（内存 + PG）、Prompt A/B 变体、用量 metrics
- `tryGatewayCompleteChat` 失败返回 `null`，由业务层决定 Demo fallback

### 2. 显式 Demo 路径

- 业务服务（resume-optimize、smart-import、quiz-score 等）检测 `isLlmConfigured()` 或 LLM 返回 null
- 走规则 Demo _parser/generator，响应带 **`source: 'llm' | 'demo'`**
- 前端：`ResumeProvider`、`AdminImportPage` 等 **Demo 强确认弹窗**

### 3. 健康探测

```http
GET /api/info?probe=1
GET /api/resume/health?probe=1
```

`probeLlmReachable(timeoutMs=8000)` 短超时探测，区分 configured / reachable。

### 4. 环境约定

| 变量 | 用途 |
|------|------|
| `LLM_API_KEY` | 生产必填 |
| `LLM_FORCE_DEMO` | 仅 dev，强制 Demo |
| `LLM_CACHE_TTL_MS` | 缓存 TTL |

## Trade-offs

| 得 | 失 |
|----|-----|
| 无 Key 可演示全链路 | Demo 质量远低于 LLM，需文案管理预期 |
| 生产/演示行为可区分 | 每条 AI 路径需实现 fallback + source |
| 缓存降本 | 缓存可能掩盖 Prompt 变更，关键路径可 `skipCache` |

## Related Pages

- [[concepts/ai-job-prep-platform]]
- [[concepts/golden-set-regression]]
- [[patterns/resume-field-coverage]]

## Sources

- `mianshi-api/src/services/llm-gateway.ts`
- `docs/RESUME-LAUNCH-PLAN.md`: §4.4 AI 能力、Demo 确认
- `docs/10-复盘沉淀/RETROSPECTIVE.md`: §3.1 LLM 降级教训
