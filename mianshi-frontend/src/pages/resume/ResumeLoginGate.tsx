import { Link, useLocation } from 'react-router-dom'
import { FileText, LogIn } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { resumeUi } from '../../components/resume/resumeLayout'

export function ResumeLoginGate() {
  const location = useLocation()
  const redirect = encodeURIComponent(location.pathname + location.search)

  return (
    <div className={`${resumeUi.workspace} flex min-h-[70vh] items-center justify-center px-4 py-12`}>
      <Card className="max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <FileText className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-text">登录后使用简历工作台</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          简历将保存在云端，支持多份管理、AI 生成与导入、导出 PDF 及公开分享链接。
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to={`/login?redirect=${redirect}`}>
            <Button className="w-full sm:w-auto">
              <LogIn className="h-4 w-4" /> 登录
            </Button>
          </Link>
          <Link to={`/register?redirect=${redirect}`}>
            <Button variant="secondary" className="w-full sm:w-auto">注册账号</Button>
          </Link>
        </div>
        <Link to="/" className="mt-4 block text-sm text-muted hover:text-brand">返回首页</Link>
      </Card>
    </div>
  )
}
