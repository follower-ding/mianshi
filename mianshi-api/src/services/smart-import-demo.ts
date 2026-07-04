export type DemoParsedQuestion = {
  title: string
  content: string
  difficulty: string
  type: string
  tags: string[]
  keyPoints: string[]
  referenceAnswer: string
  scoringRubric: string
  followUpTemplates: string[]
  status: 'draft'
  category: string
}

const SKIP_LINE =
  /^(https?:\/\/|www\.|面试鸭|mianshiya|版权|扫码|关注|目录|第\s*\d+\s*页|page\s*\d)/i

function cleanLine(line: string) {
  return line
    .replace(/\s+/g, ' ')
    .replace(/^[-*•·]\s*/, '')
    .trim()
}

/** 规则提取面试题 — LLM 不可用时的降级 */
export function demoParseTextToQuestions(text: string, category: string): DemoParsedQuestion[] {
  const lines = text.split(/\r?\n/)
  const seen = new Set<string>()
  const out: DemoParsedQuestion[] = []

  const push = (title: string, content: string) => {
    const c = content.trim()
    if (c.length < 8) return
    if (SKIP_LINE.test(c)) return
    const key = c.slice(0, 48).toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    const t = (title.trim() || c.slice(0, 40)).slice(0, 120)
    out.push({
      title: t,
      content: c.slice(0, 800),
      difficulty: '中等',
      type: '基础',
      tags: [category],
      keyPoints: [],
      referenceAnswer: '',
      scoringRubric: '',
      followUpTemplates: [],
      status: 'draft',
      category,
    })
  }

  for (const raw of lines) {
    const line = cleanLine(raw)
    if (!line || line.length < 8) continue
    if (SKIP_LINE.test(line)) continue

    const num = line.match(/^\d{1,3}[\.\、\)\）]\s*(.+)/)
    if (num?.[1]) {
      push(num[1], num[1])
      continue
    }

    const cn = line.match(/^[（(]?[一二三四五六七八九十百]+[）)]?[\、\.．]\s*(.+)/)
    if (cn?.[1]) {
      push(cn[1], cn[1])
      continue
    }

    const md = line.match(/^#{1,3}\s+(.+)/)
    if (md?.[1] && md[1].length >= 6) {
      push(md[1], md[1])
      continue
    }

    if (
      /[?？]$/.test(line) ||
      /^(请|什么|何为|何谓|如何|为什么|为何|简述|谈谈|说说|解释|描述|对比|区别|列举|分析)/.test(line)
    ) {
      push(line.replace(/[?？]$/, ''), line)
    }
  }

  if (out.length === 0) {
    for (const block of text.split(/\n{2,}/)) {
      const p = block.trim()
      if (p.length < 20 || SKIP_LINE.test(p.split('\n')[0] ?? '')) continue
      const first = cleanLine(p.split('\n')[0] ?? p)
      push(first.slice(0, 60), p.slice(0, 600))
      if (out.length >= 10) break
    }
  }

  return out.slice(0, 20)
}

export function demoGenerateContent(title: string, category: string, difficulty: string) {
  return {
    content: `请结合 ${category} 方向，说明「${title}」的核心概念、典型应用场景，以及你在实践中会关注的要点。（难度：${difficulty}）`,
    keyPoints: ['概念表述准确', '能结合实例', '提到边界或性能', '结构清晰有条理'],
    referenceAnswer: `【演示模式】请在导入后于题库管理中补充「${title}」的参考答案。配置 LLM_API_KEY 并重启 API 后，AI 可自动生成完整答案。`,
    scoringRubric: '按概念完整性、举例质量、表达结构、深度与准确性评分。',
    followUpTemplates: ['能否再深入展开？', '线上遇到过相关场景吗？'],
  }
}

export function demoSuggestFields(title: string, content: string) {
  return {
    keyPoints: [`理解${title}的定义`, '能说明适用场景', '提到常见误区', '表达简洁有条理'],
    referenceAnswer: `【演示模式】请人工补充「${title}」参考答案。题干：${content.slice(0, 120)}…`,
    scoringRubric: '概念准确、举例恰当、逻辑清晰、深度适中。',
    followUpTemplates: ['还有别的实现方式吗？', '生产环境如何排查？'],
  }
}
