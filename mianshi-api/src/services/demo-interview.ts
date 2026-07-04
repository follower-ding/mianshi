import {
  createSession,
  getSession,
  recordRound,
  getCurrentQuestion,
  updateSession,
  type RoundRecord,
} from './session.js'
import { pickFollowUp } from './question-selector.js'
import { scoreByKeyPoints } from './scoring.js'
import { incrementMetric } from './metrics.js'

export type { RoundRecord }

export { createSession, getSession, recordRound }

const DEMO_FEEDBACK = [
  '回答结构清晰，可以再补充实际项目案例。',
  '基础掌握不错，建议深入底层原理。',
  '表达流畅，下一步可以挑战更复杂的系统设计题。',
]

export function getDemoOpeningMessage(session: { position: string; experience: string; questionPlan: { content: string }[] }) {
  const first = session.questionPlan[0]
  const qText = first?.content ?? '请做一个简短的自我介绍。'
  return `你好！欢迎参加 ${session.position} 模拟面试（${session.experience || '不限年限'}）。我是 AI 面试官，准备好了吗？\n\n第一个问题：${qText}`
}

export async function getDemoReply(sessionId: string, answer: string) {
  const session = await getSession(sessionId)
  if (!session) throw new Error('Session not found')

  if (session.followUpActive) {
    const briefFeedback = answer.trim().length >= 30 ? '追问回答不错。' : '追问回答偏简略，建议结合原理展开。'

    session.followUpActive = false
    session.questionIndex += 1
    await updateSession(session)

    const finished = session.questionIndex >= session.questionPlan.length

    if (finished) {
      return {
        reply: `${briefFeedback}\n\n🎉 面试结束！总分 ${session.totalScore} 分。建议复盘薄弱知识点并继续练习。`,
        scoreDelta: 0,
        feedback: briefFeedback,
        finished: true,
        totalScore: session.totalScore,
        demo: true,
      }
    }

    const next = getCurrentQuestion(session)
    return {
      reply: `${briefFeedback}\n\n下一个问题：${next?.content ?? '请继续。'}`,
      scoreDelta: 0,
      feedback: briefFeedback,
      finished: false,
      totalScore: session.totalScore,
      demo: true,
    }
  }

  const currentQ = getCurrentQuestion(session)
  const questionText = currentQ?.content ?? '请继续回答。'
  const keyPoints = currentQ?.keyPoints ?? []

  const scored = scoreByKeyPoints(answer, keyPoints, currentQ?.referenceAnswer)
  const scoreDelta = scored.total
  const feedback = scored.feedback || DEMO_FEEDBACK[session.answerCount % DEMO_FEEDBACK.length]

  const shouldFollowUp =
    scored.total < 16 &&
    scored.missingPoints.length > 0 &&
    (currentQ?.followUpTemplates?.length ?? 0) > 0

  await recordRound(
    sessionId,
    questionText,
    answer,
    scoreDelta,
    feedback,
    currentQ?.questionId,
    scored.dimensions,
    { advanceIndex: !shouldFollowUp },
  )

  const fresh = await getSession(sessionId)
  if (!fresh) throw new Error('Session not found')
  Object.assign(session, fresh)

  if (shouldFollowUp && currentQ) {
    session.followUpActive = true
    await updateSession(session)
    await incrementMetric('interview.follow_up')
    const followUp = pickFollowUp(scored.missingPoints, currentQ.followUpTemplates ?? [])
    return {
      reply: `${feedback}\n\n追问：${followUp}`,
      scoreDelta,
      feedback,
      finished: false,
      totalScore: session.totalScore,
      demo: true,
    }
  }

  const finished = session.questionIndex >= session.questionPlan.length

  if (finished) {
    return {
      reply: `${feedback}\n\n🎉 面试结束！总分 ${session.totalScore} 分。${scored.missingPoints.length ? `建议加强：${scored.missingPoints.slice(0, 2).join('、')}。` : '表现不错，建议继续巩固项目经验。'}`,
      scoreDelta,
      feedback,
      finished: true,
      totalScore: session.totalScore,
      demo: true,
    }
  }

  const next = getCurrentQuestion(session)
  const nextQ = next?.content ?? '请继续。'

  return {
    reply: `${feedback}\n\n下一个问题：${nextQ}`,
    scoreDelta,
    feedback,
    finished: false,
    totalScore: session.totalScore,
    demo: true,
  }
}

export function buildInterviewSystemPrompt(
  position: string,
  experience: string,
  currentQuestion?: string,
  questionPlan?: { title: string; type: string; difficulty: string }[],
) {
  const planHint = questionPlan?.length
    ? `\n7. 本次面试题库（按顺序）：\n${questionPlan.map((q, i) => `   ${i + 1}. [${q.type}/${q.difficulty}] ${q.title}`).join('\n')}\n8. 优先使用题库中的题目，可口语化改写但不要偏离考点`
    : ''

  const currentHint = currentQuestion
    ? `\n当前应出题目（可口语化）：${currentQuestion}`
    : ''

  return `你是一位专业的 ${position} 技术面试官，候选人工作年限：${experience || '未指定'}。
要求：
1. 每次只问一个技术问题，难度匹配岗位与年限
2. 候选人回答后，先简短点评（1-2句），再追问或出下一题
3. 共进行 4-5 轮问答后，给出整体评价并说「本次面试结束，感谢参加」，此时不要再提任何新问题
4. 结束语必须包含「本次面试结束」，且结尾不能有任何问号
5. 语气专业、友好，使用中文
6. 覆盖：基础原理、项目经验、场景设计${planHint}${currentHint}`
}

/** 判断面试是否应结束：仅当明确结束且未继续提问时返回 true */
export function isInterviewFinished(reply: string, answerCount: number): boolean {
  const text = reply.trim()
  if (!text) return false

  const hasQuestion = /[？?]/.test(text)
  const asksMore =
    hasQuestion ||
    /(?:请问|下一个问题|那么我们换|来一道|继续问|偏实战的问题|你如何看待|请描述|请谈谈|如何解决|怎么做|什么是|有哪些|能不能)/.test(
      text,
    )

  const explicitEnd =
    /本次面试结束|面试已结束|面试结束[。！!]?|感谢(?:您|你)参加(?:本次)?面试|我们就聊到这里/.test(text)

  if (explicitEnd && !asksMore) return true

  if (answerCount >= 6) {
    const tail = text.split(/[。！!\n]/).filter(Boolean).slice(-2).join('')
    return !/[？?]/.test(tail) && !/(?:请问|下一个问题|那么我们)/.test(tail)
  }

  return false
}

export function appendRoundHint(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  answerCount: number,
  maxRounds: number,
  missingPoints?: string[],
) {
  const hints: { role: 'user'; content: string }[] = []

  if (missingPoints?.length) {
    hints.push({
      role: 'user',
      content: `[系统提示] 候选人遗漏要点：${missingPoints.slice(0, 3).join('、')}。请先简短点评，再基于 Rubric 缺口追问 1 个相关问题，不要直接出下一道主题。`,
    })
  }

  if (answerCount >= maxRounds - 1) {
    hints.push({
      role: 'user',
      content:
        '[系统提示] 已完成足够轮次，请做总结点评并说「本次面试结束，感谢参加」，不要再问新问题。',
    })
  } else if (answerCount === maxRounds - 2) {
    hints.push({
      role: 'user',
      content: '[系统提示] 这是最后一题，请点评后出最后一道综合题。',
    })
  }

  return hints.length ? [...messages, ...hints] : messages
}

export function buildScorePrompt(
  position: string,
  question: string,
  answer: string,
  keyPoints: string[] = [],
  scoringRubric = '',
) {
  const pointsText = keyPoints.length
    ? keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')
    : '（无预置要点）'
  return [
    {
      role: 'system' as const,
      content:
        '你是面试评分助手。根据候选人回答和得分要点给出 0-20 分整数和一句中文反馈。只输出 JSON：{"score":15,"feedback":"..."}',
    },
    {
      role: 'user' as const,
      content: `岗位：${position}\n问题：${question}\n得分要点：\n${pointsText}\n评分说明：${scoringRubric || '按要点覆盖度评分'}\n回答：${answer}`,
    },
  ]
}

export function buildFinishPrompt(
  position: string,
  history: string,
  totalScore: number,
  roundCount: number,
) {
  return [
    {
      role: 'system' as const,
      content: `你是面试总结助手。根据整场模拟面试对话，生成结构化复盘报告。
总分：${totalScore}，共 ${roundCount} 轮。
只输出 JSON，字段如下：
{
  "summary": "200字以内整体评价",
  "strengths": ["优势1", "优势2"],
  "improvements": ["待改进1", "待改进2"],
  "overallRating": "优秀|良好|合格|待提升 四选一",
  "nextSteps": ["学习建议1", "学习建议2", "学习建议3"],
  "scoreBreakdown": [{"topic":"题目主题","score":15,"comment":"简短点评"}]
}
scoreBreakdown 需覆盖每轮问答，score 为 0-20 整数。`,
    },
    {
      role: 'user' as const,
      content: `岗位：${position}\n对话记录：\n${history}`,
    },
  ]
}

const DEMO_ASSIST_ANSWERS: Record<string, string[]> = {
  'Java 后端开发': [
    'HashMap 底层是数组加链表，JDK 8 后链表过长会转红黑树。put 时先算 hash 定位桶，冲突则链地址法插入。扩容时容量翻倍并 rehash。ConcurrentHashMap 用分段锁/CAS 保证线程安全。',
    'Spring IOC 通过反射创建和管理 Bean 生命周期；AOP 基于动态代理，在方法前后织入切面逻辑，常用于日志、事务、权限等横切关注点。',
    '秒杀系统要点：前端限流与验证码、Redis 预减库存、MQ 异步下单、数据库乐观锁防超卖、CDN 静态资源、热点数据本地缓存。',
    'JVM GC 有标记-清除、标记-整理、复制算法。常见收集器有 Serial、Parallel、CMS、G1、ZGC。G1 将堆划分为 Region，优先回收垃圾最多的区域，兼顾吞吐与停顿。',
  ],
  'Go 后端开发': [
    'Goroutine 是用户态轻量线程，栈初始约 2KB，由 Go runtime 调度，切换成本低；OS 线程由内核调度，创建和切换开销更大。',
    'Channel 底层是 hchan 结构，包含环形队列、发送/接收等待队列和互斥锁，支持有缓冲和无缓冲两种模式。',
    '排查内存泄漏：pprof 看 heap/goroutine、检查未关闭的连接和 goroutine 泄漏、用 go tool trace 分析调度。',
  ],
  'Python 后端开发': [
    'GIL 是全局解释器锁，同一时刻只允许一个线程执行字节码，影响 CPU 密集型多线程性能，I/O 密集型影响较小。',
    'Django 请求经 WSGI/ASGI → 中间件链 → URL 路由 → 视图 → 模板/JSON 响应，ORM 在视图层操作数据库。',
    '性能优化：用 asyncio/多进程、数据库索引与查询优化、Redis 缓存、Cython 加速热点代码、合理选择数据结构。',
  ],
  '前端开发': [
    'DNS 解析 → TCP 连接 → HTTP 请求 → 服务器响应 → 浏览器解析 HTML/CSS/JS → 构建 DOM/CSSOM → 布局 → 绘制 → 合成。',
    'Hooks 依赖闭包和链表结构存储状态，useState/useEffect 等在 fiber 节点上挂载，渲染时按顺序执行。',
    '首屏优化：代码分割、懒加载、SSR/SSG、CDN、图片压缩与 WebP、关键 CSS 内联、预连接与 prefetch。',
  ],
}

export function buildAssistPrompt(
  position: string,
  experience: string,
  question: string,
  variant = 0,
) {
  const variantHint =
    variant > 0
      ? `\n6. 这是第 ${variant + 1} 版答案，请换一种表述或结构，避免与常见模板雷同`
      : ''
  return [
    {
      role: 'system' as const,
      content: `你是面试辅导助手，帮助候选人回答 ${position} 技术面试问题。候选人工作年限：${experience || '未指定'}。
要求：
1. 给出专业、结构化的参考答案，350-550 字，内容要充实、有深度
2. 使用中文，第一人称口语化表达，可直接口述
3. 建议分 2-3 段：先给结论/定义 → 再展开原理、对比或分层细节 → 最后补充应用场景或项目案例（可虚构合理案例）
4. 覆盖题目核心考点，适当点出易错点或面试加分项
5. 只输出答案正文，不要加标题、序号前缀或多余说明${variantHint}`,
    },
    {
      role: 'user' as const,
      content: `面试官问题：${question}`,
    },
  ]
}

export function getDemoAssist(position: string, question: string, variant = 0) {
  const answers = DEMO_ASSIST_ANSWERS[position] ?? DEMO_ASSIST_ANSWERS['Java 后端开发']
  const idx = Math.abs(question.length + variant * 7) % answers.length
  return answers[idx]
}

export function getAssistFromReference(
  referenceAnswer: string,
  position: string,
  question: string,
  variant = 0,
) {
  const ref = referenceAnswer.trim()
  if (ref) {
    if (variant === 0) return ref
    const parts = ref.split(/\n{2,}|(?<=[。！!])\s+/).map((p) => p.trim()).filter((p) => p.length >= 20)
    if (parts.length > 1) {
      return parts[variant % parts.length]
    }
    if (ref.length > 120) {
      const mid = Math.floor(ref.length / 2)
      return variant % 2 === 1 ? ref.slice(0, mid).trim() : ref.slice(mid).trim()
    }
    return ref
  }
  return getDemoAssist(position, question, variant)
}
