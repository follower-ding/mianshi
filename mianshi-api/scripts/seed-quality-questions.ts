/**
 * 写入/更新高质量示范题库（图文并茂 Markdown）
 * 运行：cd mianshi-api && npx tsx scripts/seed-quality-questions.ts
 */
import 'dotenv/config'
import { initDatabase } from '../src/db/init.js'
import {
  createQuestion,
  getQuestion,
  listQuestions,
  updateQuestion,
} from '../src/services/store.js'

const DEMO_QUESTIONS = [
  {
    title: 'JVM 垃圾回收机制详解',
    category: 'Java',
    difficulty: '中等',
    type: '基础',
    tags: ['JVM', 'GC', 'G1'],
    content: '请说明 JVM 如何判断对象可回收，并对比常见垃圾收集器及其适用场景。',
    referenceAnswer: `## 回答重点

JVM 通过 **可达性分析**（GC Roots 出发）判定对象是否存活，不可达对象可被回收。

![JVM 堆内存分区](/api/diagrams/jvm-heap.svg)

### 常见收集器

1. **Serial / Parallel** — 吞吐量优先，适合后台批处理
2. **CMS** — 追求低停顿，已逐步被 G1 替代
3. **G1** — Region 化分代，Mixed GC 回收垃圾最多区域
4. **ZGC / Shenandoah** — 超低延迟，适合大堆

### 面试加分

- 能说明 Minor GC / Full GC 触发条件
- 结合项目说明如何选择收集器与堆参数

## 扩展知识

- 安全点（Safepoint）与 STW
- 跨代引用与 Remembered Set`,
    keyPoints: [
      '可达性分析与 GC Roots',
      '分代收集思想',
      '至少对比两种收集器',
      '结合业务说明选型',
    ],
    scoringRubric: '覆盖判定方法、分代结构、两种以上收集器及场景得高分',
    followUpTemplates: ['线上如何排查 Full GC 频繁？', 'G1 的 Mixed GC 何时触发？'],
    status: 'published' as const,
  },
  {
    title: 'HashMap 底层原理与线程安全问题',
    category: 'Java',
    difficulty: '中等',
    type: '基础',
    tags: ['HashMap', 'ConcurrentHashMap', '集合'],
    content: 'HashMap 在 JDK8 中如何实现？put 流程是什么？为什么不保证线程安全？',
    referenceAnswer: `## 回答重点

JDK8 **HashMap** 数组 + 链表/红黑树，链表长度 ≥ 8 且数组 ≥ 64 时树化。

![HashMap 结构](/api/diagrams/hashmap-structure.svg)

### put 流程简述

1. 计算 \`hash(key)\` 并扰动
2. 定位桶下标 \`(n-1) & hash\`
3. 无冲突直接插入；冲突则拉链或树化
4. 超阈值 \`capacity * loadFactor\` 则扩容 2 倍

### 线程安全

- \`HashMap\` 非线程安全，并发 put 可能死循环/丢数据（JDK7）或结构破坏
- 并发场景用 \`ConcurrentHashMap\`（CAS + synchronized 桶锁）

## 扩展知识

- 为什么容量总是 2 的幂
- \`equals\` 与 \`hashCode\` 契约`,
    keyPoints: ['数组+链表/红黑树', 'hash与下标计算', '扩容机制', 'ConcurrentHashMap 替代'],
    scoringRubric: '需讲清结构、put 流程、线程安全问题及替代方案',
    followUpTemplates: ['ConcurrentHashMap 1.7 和 1.8 区别？', '为什么负载因子是 0.75？'],
    status: 'published' as const,
  },
  {
    title: '最近 OpenClaw 这么火，你知道它的原理吗？',
    category: 'AI',
    difficulty: '中等',
    type: '开放',
    tags: ['OpenClaw', 'Agent', 'LLM', 'AI网关'],
    content: '请解释 OpenClaw 的核心架构，以及它与传统 Agent 框架的区别。',
    referenceAnswer: `## 回答重点

**OpenClaw** 是开源的多通道 **AI 网关**：统一接入 WhatsApp、Telegram、Slack 等 IM，再路由到 LLM 与工具。

![Agentic Loop 推理循环](/api/diagrams/agent-loop.svg)

### 核心模块

1. **Gateway** — 会话管理、消息路由、鉴权
2. **Agent Runtime** — 维护上下文，驱动 LLM 推理循环
3. **Channel 插件** — 各 IM 协议适配
4. **Tool 执行层** — 解析 \`tool_call\` 并回调结果

### 与 LangChain 的区别

| 维度 | OpenClaw | LangChain |
|------|----------|-----------|
| 定位 | 多通道消息网关 | 应用编排框架 |
| 强项 | IM 接入、会话路由 | Chain/RAG/Tool 组合 |

## 扩展知识

- 多 Agent 协作与消息队列解耦
- 生产部署：Gateway 高可用 + 工具沙箱`,
    keyPoints: [
      '多通道 AI 网关定位',
      'Agentic Loop 四步循环',
      '与 LangChain 差异',
      '典型部署架构',
    ],
    scoringRubric: '说清 Gateway 职责、推理循环、与框架对比、落地考量',
    followUpTemplates: ['如何设计 Tool 权限沙箱？', '多 Channel 会话如何隔离？'],
    status: 'published' as const,
  },
  {
    title: 'MySQL InnoDB 索引为什么用 B+Tree？',
    category: '数据库',
    difficulty: '中等',
    type: '基础',
    tags: ['MySQL', 'B+Tree', 'InnoDB'],
    content: '为什么 InnoDB 选择 B+Tree 而不是 B 树或 Hash？聚簇索引与二级索引有何区别？',
    referenceAnswer: `## 回答重点

**B+Tree** 只在叶子节点存数据，非叶节点仅索引键，扇出高、树高低，磁盘 IO 少。

![InnoDB B+Tree 索引](/api/diagrams/mysql-btree.svg)

### 对比其他结构

- **B 树**：非叶也存数据，扇出低，范围扫描不如 B+Tree
- **Hash**：等值快，不支持有序范围扫描与最左前缀

### 聚簇 vs 二级索引

- **聚簇索引**：叶子存整行，表数据即索引
- **二级索引**：叶子存主键值，查询可能 **回表**

## 扩展知识

- 覆盖索引避免回表
- 最左前缀原则与联合索引设计`,
    keyPoints: ['B+Tree 扇出与树高', '聚簇/二级索引', '回表与覆盖索引', '最左前缀'],
    scoringRubric: '需对比 B/B+/Hash，说明聚簇与二级索引及回表',
    followUpTemplates: ['什么情况下索引会失效？', '如何设计联合索引？'],
    status: 'published' as const,
  },
]

async function upsertByTitle(input: (typeof DEMO_QUESTIONS)[0]) {
  const existing = (await listQuestions()).find((q) => q.title === input.title)
  if (existing) {
    await updateQuestion(existing.id, input)
    return { id: existing.id, action: 'updated' as const }
  }
  const created = await createQuestion({
    ...input,
    userId: undefined,
    position: [],
  })
  return { id: created.id, action: 'created' as const }
}

async function main() {
  await initDatabase()
  for (const q of DEMO_QUESTIONS) {
    const { id, action } = await upsertByTitle(q)
    const saved = await getQuestion(id)
    console.log(`${action}: ${saved?.title} (${id})`)
  }
  console.log('Done — 4 demo questions with images.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
