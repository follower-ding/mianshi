import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BRAND } from '../lib/brand'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'

export function RegisterPage() {
  const { register, authEnabled } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register(email, password, name)
      const safe =
        redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
      navigate(safe)
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  if (!authEnabled) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Card className="p-6">
          <p className="text-text-secondary">注册需要 PostgreSQL 数据库支持。</p>
          <Link to="/" className="mt-4 inline-block text-sm text-brand-dark hover:underline">返回首页</Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 animate-fade-in">
      <Card className="p-6">
        <h1 className="text-xl font-bold text-text">注册账号</h1>
        <p className="mt-1 text-sm text-text-secondary">创建 {BRAND.displayName} 账号</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <FormField label="昵称">
            <Input
              placeholder="如何称呼你"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </FormField>
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
          <FormField label="密码" hint="至少 6 位" error={error ?? undefined}>
            <Input
              type="password"
              placeholder="设置登录密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '注册中...' : '注册并进入首页'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-text-secondary">
          已有账号？
          <Link to={loginHref} className="text-brand-dark hover:underline">
            登录
          </Link>
        </p>
      </Card>
    </div>
  )
}
