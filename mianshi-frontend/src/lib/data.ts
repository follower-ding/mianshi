export const NAV_ITEMS = [
  { label: '首页', path: '/' },
  { label: '快速面试', path: '/quick' },
  { label: '简历工作台', path: '/resume/mine' },
  { label: '智能投递', path: '/jobs' },
  { label: '面试题库', path: '/questions' },
  { label: '真实面经', path: '/experiences' },
] as const

/** 预留：有新入口时再加入「更多」菜单 */
export const MORE_MENU_ITEMS: ReadonlyArray<{
  label: string
  path: string
  badge?: string
}> = []

export const USER_MENU_ITEMS = [
  { label: '我的简历', path: '/resume/mine' },
  { label: '个人中心', path: '/profile' },
  { label: '面试记录', path: '/reports' },
] as const

export const POSITIONS = [
  'Java 后端开发',
  'C++ 后端开发',
  'Go 后端开发',
  'Python 后端开发',
  '前端开发',
  '算法工程师',
  '产品经理',
  '测试开发',
] as const

export const EXPERIENCE_LEVELS = [
  '应届生',
  '1-3 年',
  '3-5 年',
  '5-10 年',
  '10 年以上',
] as const

export const QUICK_TAGS = [
  'Java 后端开发',
  'C++ 后端开发',
  'Go 后端开发',
  'Python 后端开发',
] as const

export type Message = {
  id: string
  role: 'interviewer' | 'candidate'
  content: string
  streaming?: boolean
}

/** 与后端 isInterviewFinished 保持一致：仍在提问时不应结束 */
export function shouldShowInterviewComplete(serverFinished: boolean, lastReply: string): boolean {
  if (!serverFinished) return false
  const text = lastReply.trim()
  const asksMore =
    /[？?]/.test(text) ||
    /(?:请问|下一个问题|那么我们换|来一道|继续问|偏实战的问题|请描述|请谈谈)/.test(text)
  const explicitEnd =
    /本次面试结束|面试已结束|感谢(?:您|你)参加(?:本次)?面试|我们就聊到这里/.test(text)
  if (asksMore && !explicitEnd) return false
  return true
}

export const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'interviewer',
    content: 'Can you talk about the JVM garbage collection mechanism?',
  },
  {
    id: '2',
    role: 'candidate',
    content:
      'JVM 垃圾回收机制主要包括标记-清除、标记-整理和复制算法。新生代使用 Serial、ParNew、Parallel Scavenge 等收集器，老年代使用 Serial Old、Parallel Old、CMS 和 G1 等。G1 是目前主流选择，它将堆划分为多个 Region，优先回收垃圾最多的区域，兼顾吞吐量和停顿时间。',
  },
  {
    id: '3',
    role: 'interviewer',
    content: 'How do you optimize MySQL query performance?',
  },
  {
    id: '4',
    role: 'candidate',
    content:
      'MySQL 查询优化可以从索引、SQL 语句和架构三个层面入手：合理创建联合索引并避免索引失效；减少 SELECT *，用 EXPLAIN 分析执行计划；对大表考虑分库分表或读写分离；适当调整 buffer pool 等参数。',
  },
  {
    id: '5',
    role: 'interviewer',
    content: 'What are the persistence mechanisms of Redis?',
  },
  {
    id: '6',
    role: 'candidate',
    content:
      'Redis 提供 RDB 和 AOF 两种持久化方式。RDB 通过快照保存某一时刻的数据，恢复快但可能丢失最近数据；AOF 记录每条写命令，数据更安全但文件较大。生产环境通常两者结合，并开启 AOF 重写。',
  },
]

export const INTERVIEW_QUESTIONS = [
  {
    id: 'q1',
    title: 'JVM 垃圾回收机制详解',
    category: 'Java',
    difficulty: '中等',
    tags: ['JVM', 'GC'],
    views: 12840,
  },
  {
    id: 'q2',
    title: 'MySQL 索引底层原理',
    category: '数据库',
    difficulty: '中等',
    tags: ['MySQL', 'B+Tree'],
    views: 9560,
  },
  {
    id: 'q3',
    title: 'Redis 持久化与集群方案',
    category: '中间件',
    difficulty: '困难',
    tags: ['Redis', '高可用'],
    views: 8720,
  },
  {
    id: 'q4',
    title: 'TCP 三次握手与四次挥手',
    category: '计算机网络',
    difficulty: '简单',
    tags: ['网络', 'TCP'],
    views: 15300,
  },
  {
    id: 'q5',
    title: 'Spring Boot 自动配置原理',
    category: 'Java',
    difficulty: '中等',
    tags: ['Spring', '源码'],
    views: 11200,
  },
  {
    id: 'q6',
    title: 'React 虚拟 DOM 与 Diff 算法',
    category: '前端',
    difficulty: '中等',
    tags: ['React', '渲染'],
    views: 7800,
  },
]

export const LEARNING_PATHS = [
  {
    id: 'p1',
    title: 'Java 后端工程师',
    stages: 8,
    questions: 120,
    duration: '4-6 周',
    color: 'from-orange-400 to-red-500',
  },
  {
    id: 'p2',
    title: 'Go 后端工程师',
    stages: 7,
    questions: 95,
    duration: '3-5 周',
    color: 'from-cyan-400 to-blue-500',
  },
  {
    id: 'p3',
    title: '前端开发工程师',
    stages: 6,
    questions: 88,
    duration: '3-4 周',
    color: 'from-purple-400 to-pink-500',
  },
  {
    id: 'p4',
    title: '算法工程师',
    stages: 10,
    questions: 200,
    duration: '6-8 周',
    color: 'from-green-400 to-emerald-500',
  },
]

export const EXPERIENCES = [
  {
    id: 'e1',
    company: '字节跳动',
    position: 'Java 后端',
    result: '通过',
    rounds: 4,
    author: '匿名用户',
    date: '2025-12',
    summary: '重点考察 JVM、分布式事务和系统设计，手撕了一道 LRU 缓存题。',
  },
  {
    id: 'e2',
    company: '阿里巴巴',
    position: 'Go 后端',
    result: '通过',
    rounds: 5,
    author: 'Go选手',
    date: '2025-11',
    summary: '三面深挖 channel 原理和 goroutine 调度，四面系统设计考察消息队列。',
  },
  {
    id: 'e3',
    company: '腾讯',
    position: '前端开发',
    result: '待定',
    rounds: 3,
    author: '前端小白',
    date: '2026-01',
    summary: '一面基础 + 二面项目深挖，三面考察 React 性能优化和工程化。',
  },
  {
    id: 'e4',
    company: '美团',
    position: 'Python 后端',
    result: '通过',
    rounds: 4,
    author: 'PyDev',
    date: '2025-10',
    summary: 'Django/Flask 框架对比、异步编程、数据库优化是高频考点。',
  },
]

export const AI_QUESTIONS: Record<string, string[]> = {
  'Java 后端开发': [
    '请介绍一下 HashMap 的底层实现原理。',
    'Spring IOC 和 AOP 是如何工作的？',
    '如何设计一个高并发的秒杀系统？',
  ],
  'Go 后端开发': [
    'Go 的 goroutine 和线程有什么区别？',
    'channel 的底层实现是什么？',
    '如何排查 Go 程序的内存泄漏？',
  ],
  'Python 后端开发': [
    'Python 的 GIL 是什么，有什么影响？',
    'Django 的请求处理流程是怎样的？',
    '如何优化 Python 应用的性能？',
  ],
  '前端开发': [
    '浏览器从输入 URL 到页面渲染经历了哪些步骤？',
    'React 的 Hooks 原理是什么？',
    '如何优化首屏加载速度？',
  ],
}

export const RESUME_TEMPLATES = [
  {
    id: 'classic-business',
    name: '极简专业简历模板',
    style: '适合传统行业与国企',
    tags: ['校招', '实习', '社招'],
  },
  {
    id: 'tech-simple',
    name: '科技简约简历模板',
    style: '适合互联网与技术岗位',
    tags: ['后端', '前端', '实习'],
  },
  {
    id: 'creative-design',
    name: '创意设计简历模板',
    style: '适合设计与产品岗位',
    tags: ['产品', '设计', '运营'],
  },
  {
    id: 'academic-research',
    name: '学术科研简历模板',
    style: '适合研究与算法岗位',
    tags: ['算法', '科研', '校招'],
  },
  {
    id: 'modern-minimal',
    name: '现代极简简历模板',
    style: '清爽留白，适合通用岗位',
    tags: ['通用', '社招', '转行'],
  },
  {
    id: 'executive-pro',
    name: '商务精英简历模板',
    style: '沉稳大气，适合管理与金融',
    tags: ['管理', '金融', '高管'],
  },
  {
    id: 'fresh-campus',
    name: '清新校招简历模板',
    style: '活泼友好，适合应届生',
    tags: ['校招', '实习', '应届'],
  },
  {
    id: 'data-analyst',
    name: '数据分析简历模板',
    style: '结构清晰，适合数据与商业分析',
    tags: ['数据', '分析', '商业'],
  },
] as const

export type ResumeTemplateId = (typeof RESUME_TEMPLATES)[number]['id']
