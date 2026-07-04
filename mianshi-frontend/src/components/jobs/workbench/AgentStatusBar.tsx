import { AgentLogStream } from '../AgentLogStream'

type Props = {
  logRefreshKey: number
  bossNeedsLogin?: boolean
  onBossLogin?: () => void
}

/** 非侵入式单行状态提示 */
export function AgentStatusBar({ logRefreshKey, bossNeedsLogin, onBossLogin }: Props) {
  return (
    <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-1 py-1">
      <div className="min-w-0 flex-1">
        <AgentLogStream refreshKey={logRefreshKey} maxItems={3} mode="indicator" />
      </div>
      {bossNeedsLogin && onBossLogin && (
        <button
          type="button"
          onClick={onBossLogin}
          className="shrink-0 text-xs font-medium text-cyan-400 underline-offset-2 hover:text-cyan-300 hover:underline"
        >
          登录 Boss 账号
        </button>
      )}
    </div>
  )
}
