# Offer通 质量评估与保障架构报告

> 更新时间：2026-06-10  
> 状态：Phase 3 平台化 ✅ 已完成

---

## 一、当前网站质量评估（基线打分）

| 维度 | 得分 | 现状 | 主要风险 |
|------|------|------|----------|
| **核心面试体验** | 8/10 | 流式对话、语音、报告、题库驱动、追问已打通 | LLM 表达仍不可控 |
| **评分可信度** | 6/10 | Rubric + keyPoints 规则分 + LLM 四维融合 | 需更多 Golden Set 校准 |
| **题库质量** | 6/10 | 结构化字段 + 审核 + 去重 + 面试抽题 | 题量仍偏少 |
| **内容治理** | 7/10 | 状态流 + 审核 + 运营后台 + 面经审核 + 质量回归 | — |
| **稳定性** | 7/10 | Session 持久化 + LLM 降级 | 内存计数器重启丢失 |
| **可观测性** | 6/10 | 指标 PG 持久化 + 系统监控页 | — |
| **安全合规** | 7/10 | JWT + admin 鉴权 + 面经 UGC 审核 | — |
| **综合** | **7.8/10** | 闭环增强：个人中心、路线阶段、面经审核、报告回程 | 生产部署待加强 |

**结论：** 功能链路完整，但「质量」目前依赖 Prompt 和人工信任，**没有可度量、可审核、可回归**的质量基础设施。

---

## 二、当前架构的质量短板

### 2.1 面试引擎

- 出题完全由 LLM 自由发挥，**未绑定题库**
- Demo 模式：`scoreDelta = Math.random()` — **评分无意义**
- 评分 Prompt 仅一句 JSON 要求，**无维度、无参考答案、无 Rubric**

### 2.2 题库

- 只有字段长度校验，**无质量字段**（考点、标准答案、评分 Rubric、来源、状态）
- 无审核流、无重复检测、无与岗位的映射关系
- 面试 `/interview/*` 与 `/questions/*` **零集成**

---

## 三、目标：质量保障体系架构

核心思路：**把「质量」从 Prompt 里抽出来，变成可配置、可度量、可回归的系统能力。**

```
┌─────────────────────────────────────────────────────────┐
│                    质量保障层 Quality Platform           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 题库治理  │ │ 面试编排  │ │ 评分引擎  │ │ QA 回归  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
└───────┼────────────┼────────────┼────────────┼──────────┘
        │            │            │            │
   结构化题库    Session     Rubric      Golden Set
   + 审核流      状态机       + keyPoints   + CI 脚本
```

### 3.1 面试质量指标

| 指标 | 含义 | 目标 |
|------|------|------|
| **Coverage** | 考点覆盖（基础/项目/系统设计） | 每轮面试 ≥3 类考点 |
| **Difficulty Match** | 难度与年限匹配 | 偏差率 < 15% |
| **Follow-up Depth** | 追问深度 | 每题 ≥1 次有效追问 |
| **Scoring Consistency** | 同答同分（回归集） | 方差 σ < 2 分 |
| **Session Completion** | 正常结束率 | > 95% |

### 3.2 题库质量指标

| 维度 | 标准 |
|------|------|
| **准确性** | 技术事实正确，过时考点需标注 |
| **可评性** | 有标准答案要点 + Rubric，能支撑 0-20 分 |
| **区分度** | 难度标注与实测得分分布一致 |
| **去重** | 语义相似度 < 0.85 不重复入库 |
| **覆盖度** | 每岗位 × 每难度 ≥ N 题 |

---

## 四、Interview Orchestrator（面试编排引擎）

```
Opening → SelectQuestion(题库) → Ask → Listen → Score(Rubric)
    → FollowUp / NextRound → Summary → Report
```

**三层出题策略：**

| 层级 | 来源 | 作用 |
|------|------|------|
| L1 选题 | 题库 API（按岗位/难度/标签/去重） | **保证考点与难度可控** |
| L2 表达 | LLM 改写题干（口语化、场景化） | **保证自然对话感** |
| L3 追问 | LLM + 追问模板（基于 Rubric 缺口） | **保证深度，不跑题** |

---

## 五、评分引擎（Scoring Engine）

**目标输出：**

```typescript
type RoundScore = {
  dimensions: { accuracy, depth, structure, practice }  // 各 0-5
  total: number       // 0-20
  feedback: string
  missingPoints: string[]
  hitPoints: string[]
}
```

**保障手段：**

1. **Rubric 绑定**：每题预置 `scoringRubric` + `referenceAnswer` + `keyPoints[]`
2. **双阶段评分**：keyPoints 规则初评 → LLM 微调（可选）
3. **Golden Set 回归**：`npm run quality:regression`
4. **Demo 禁用随机分**：改为 Rubric 规则分

---

## 六、题库数据模型（QuestionV2）

```typescript
type Question = {
  // 基础
  id, title, category, difficulty, tags, content, views, createdAt
  // 质量字段
  position: string[]           // 适用岗位
  type: '基础' | '项目' | '系统设计' | '算法' | '开放'
  status: 'draft' | 'review' | 'published' | 'archived'
  referenceAnswer: string
  keyPoints: string[]
  scoringRubric: string
  followUpTemplates: string[]
}
```

**治理流程：** 录入 → 自动质检 → 人工审核 → published → 面试抽题 → 答题回流 → 难度校准

---

## 七、分阶段落地计划

### Phase 1：质量地基（当前阶段）✅ 已完成

- [x] 写入本报告
- [x] 题库模型扩展：`referenceAnswer`、`keyPoints`、`scoringRubric`、`status`
- [x] 面试启动时从题库抽题（Demo/AI 均绑定 questionPlan）
- [x] 评分改为 Rubric + keyPoints 命中（禁用 Demo 随机分）
- [x] Golden Set 30 组 + `npm run quality:regression`
- [x] Session 持久化到 `db.json`

### Phase 2：治理闭环 ✅ 已完成

- [x] 题库审核流：draft → review → published（API 校验 + 前端状态筛选/编辑）
- [x] 自动去重检测（标题/题干相似度 ≥ 0.85 拒绝入库）
- [x] 快速/标准/深度面试模式参数化（`mode=quick|standard|deep`）
- [x] 报告增加雷达图（准确/深度/结构/实战）
- [x] 指标埋点 `GET /api/metrics`

### Phase 2.5：编排与评分增强 ✅ 已完成

- [x] 抽题策略：考点类型覆盖（≥3 类）+ 年限难度匹配
- [x] LLM 评分升级为 Rubric 四维 JSON + 规则分 6:4 融合
- [x] Demo/AI 追问：得分 <16 且遗漏要点时触发 `followUpTemplates`
- [x] 质量看板：`GET /api/metrics?detailed=1`（完成率、覆盖度、均分）
- [x] 题库前端支持 type / scoringRubric / followUpTemplates 编辑
- [x] seed 补充项目题 + 算法题（q7/q8），自动合并到已有 db.json

### Phase 3：平台化 ✅ 已完成

- [x] PostgreSQL 迁移 + 用户体系（JWT 登录/注册，报告 userId 归属）
- [x] 运营后台 `/admin`（质量看板、题库审核、候选题审核）
- [x] 面经 → 候选题自动生成（LLM + Demo fallback，审核后入库）
- [x] LLM Gateway（响应缓存、Prompt A/B 变体、用量统计）
- [x] E2E 测试（Playwright smoke + auth）+ GitHub Actions CI
- [x] docker-compose PostgreSQL + 双模式存储（PG 优先 / JSON 降级）

---

## 八、Phase 1 实现说明

### 新增文件

| 文件 | 职责 |
|------|------|
| `mianshi-api/src/services/question-selector.ts` | 按岗位从题库抽题 |
| `mianshi-api/src/services/scoring.ts` | keyPoints Rubric 评分 |
| `mianshi-api/src/services/session.ts` | Session 持久化 |
| `mianshi-api/data/golden-set.json` | 评分回归标准集 |
| `mianshi-api/scripts/quality-regression.ts` | 质量回归脚本 |

### 关键设计决策

1. **Session 存 db.json** 而非 Redis — 与现有栈一致，Phase 3 再迁 PostgreSQL
2. **仅 `status=published` 且有 keyPoints 的题参与面试抽题**
3. **LLM 评分失败时 fallback 到规则评分**，不再使用随机分
4. **questionPlan 写入 Session**，Demo 与 AI 模式共用同一题序

---

## 九、总结

| 问题 | 答案 |
|------|------|
| **网站现在质量如何？** | 功能 MVP 7 分，质量可信度 4~5 分，缺体系 |
| **如何保证面试质量？** | 编排引擎 + 题库驱动 + Rubric 评分 + Golden 回归 |
| **如何保证题库质量？** | 结构化字段 + 审核 + 答题数据回流校准 |
| **最关键一步？** | **面试与题库打通** — 没有好题，Prompt 再好也不稳 |
