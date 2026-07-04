/** AI 快速生成 — 示例数据（导入时会覆盖当前表单） */
export const AI_GENERATE_EXAMPLES = [
  {
    id: 'ai-engineer',
    label: 'AI 开发工程师',
    targetJob: 'AI 开发工程师',
    personalInfo:
      '我2022年硕士毕业于上海交通大学计算机系，熟悉 Python/PyTorch，在字节跳动 AI Lab 实习参与大模型推理优化，独立做过 RAG 知识库问答项目，性格踏实、学习能力强',
  },
  {
    id: 'java-backend',
    label: 'Java 后端开发',
    targetJob: 'Java 后端开发',
    personalInfo:
      '我2020年本科毕业于东华大学，有字节跳动、腾讯等大厂实习经历，自己开发过校园社交微信小程序，个人性格积极乐观、做事追求极致',
  },
] as const

/** @deprecated 使用 AI_GENERATE_EXAMPLES */
export const AI_GENERATE_EXAMPLE = AI_GENERATE_EXAMPLES[0]
