import { LogIn, RefreshCw, Settings2, Sparkles, Unplug } from 'lucide-react'
import { Button } from '../../ui/Button'

type Props = {
  bossBound: boolean
  bossNeedsLogin: boolean
  bossName?: string
  crawling: boolean
  syncing: boolean
  onCrawl: () => void
  onSync: () => void
  onSettings: () => void
  onBossLogin?: () => void
}

export function WorkbenchToolbar({
  bossBound,
  bossNeedsLogin,
  bossName,
  crawling,
  syncing,
  onCrawl,
  onSync,
  onSettings,
  onBossLogin,
}: Props) {
  const bossReady = bossBound && !bossNeedsLogin

  return (
    <div className="mx-auto mb-3 flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Sparkles className="h-3 w-3 text-cyan-400/70" />
        <span>智能职位与消息双轨面板</span>
        {bossReady ? (
          <span className="text-[10px] text-emerald-400/80">Boss{bossName ? ` · ${bossName}` : ''}</span>
        ) : (
          <span className="text-[10px] text-red-400/80">未登录 Boss</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="secondary" onClick={onSettings}>
          <Settings2 className="h-3.5 w-3.5" />
          自动画像
        </Button>
        {onBossLogin && (
          <Button size="sm" variant={bossNeedsLogin ? 'primary' : 'secondary'} onClick={onBossLogin}>
            <LogIn className="h-3.5 w-3.5" />
            {bossNeedsLogin ? '登录 Boss' : '重新绑定 Boss'}
          </Button>
        )}
        {bossReady && (
          <>
            <Button size="sm" variant="secondary" disabled={syncing} onClick={onSync}>
              <Unplug className="h-3.5 w-3.5" />
              {syncing ? '同步中…' : '消息托管'}
            </Button>
            <Button size="sm" disabled={crawling} onClick={onCrawl}>
              <RefreshCw className={`h-3.5 w-3.5 ${crawling ? 'animate-spin' : ''}`} />
              {crawling ? '抓取中…' : '抓取 Boss'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
