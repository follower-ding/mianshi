export const CHAT_CATEGORY_LABEL = {
  all: '全部',
  new_greeting: '新招呼',
  communicating: '仅沟通',
} as const

export type ChatCategoryFilter = keyof typeof CHAT_CATEGORY_LABEL
