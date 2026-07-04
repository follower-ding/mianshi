import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BRAND } from '../lib/brand'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'

export function LoginPage() {
  const { login, authEnabled } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const registerHref = redirect
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : '/register'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      const safe =
        redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
      navigate(safe)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  if (!authEnabled) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Card className="p-6">
          <p className="text-text-secondary">用户体系需要 PostgreSQL。请启动 docker compose 并配置 DATABASE_URL。</p>
          <Link to="/" className="mt-4 inline-block text-sm text-brand-dark hover:underline">返回首页</Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 animate-fade-in">
      <Card className="p-6">
        <h1 className="text-xl font-bold text-text">登录 {BRAND.displayName}</h1>
        <p className="mt-1 text-sm text-text-secondary">登录后同步简历、刷题进度与面试报告</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <FormField label="邮箱">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </FormField>
          <FormField label="密码" error={error ?? undefined}>
            <Input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-text-secondary">
          没有账号？
          <Link to={registerHref} className="text-brand-dark hover:underline">
            注册
          </Link>
        </p>
      </Card>
    </div>
  )
}
