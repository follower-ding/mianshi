import { LogIn } from 'lucide-react'

type Props = {
  onLogin: () => void
}

export function BossLoginBanner({ onLogin }: Props) {
  return (
    <div className="mx-auto mb-3 flex max-w-[1200px] items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-100/90">
      <span>暂未检测到 Boss 登录状态，请先</span>
      <button
        type="button"
        onClick={onLogin}
        className="inline-flex items-center gap-1 font-medium text-cyan-300 underline-offset-2 hover:text-cyan-200 hover:underline"
      >
        <LogIn className="h-3.5 w-3.5" />
        登录 Boss 账号
      </button>
    </div>
  )
}
