import type { ReactNode } from 'react'

type Props = {
  paneKey: string
  children: ReactNode
  className?: string
}

/** 联系人 / 会话切换时的丝滑过渡容器 */
export function ChatPaneTransition({ paneKey, children, className = '' }: Props) {
  return (
    <div
      key={paneKey}
      className={`flex min-h-0 flex-1 flex-col animate-chat-pane-in ${className}`}
    >
      {children}
    </div>
  )
}
