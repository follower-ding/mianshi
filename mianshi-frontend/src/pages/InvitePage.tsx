import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { BRAND } from '../lib/brand'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function InvitePage() {
  return (
    <div className="mx-auto max-w-[520px] px-4 py-16 text-center lg:px-8 animate-fade-in">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand">
        <Clock className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-text">邀请有礼</h1>
      <p className="mt-2 text-sm text-text-secondary">功能筹备中，上线后将支持邀请好友与奖励机制。</p>

      <Card className="mt-8 p-6 text-left">
        <p className="text-sm leading-relaxed text-text-secondary">
          {BRAND.name} 正在打磨核心面试与简历能力，邀请体系将在后续版本开放。欢迎关注产品更新。
        </p>
      </Card>

      <Link to="/" className="mt-8 inline-block">
        <Button variant="secondary">返回首页</Button>
      </Link>
    </div>
  )
}
