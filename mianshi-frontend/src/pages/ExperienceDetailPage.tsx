import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Pencil,
  Trash2,
  User,
} from 'lucide-react'
import { api, type Experience } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { MarkdownContent } from '../components/markdown/MarkdownContent'
import { ExperienceFormModal } from '../components/experiences/ExperienceFormModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Loading } from '../components/ui/Loading'

const RESULT_VARIANT: Record<string, 'success' | 'warning' | 'danger'> = {
  通过: 'success',
  待定: 'warning',
  未通过: 'danger',
}

export function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [item, setItem] = useState<Experience | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    api
      .getExperience(id)
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  const canManage = item && (user?.role === 'admin' || item.userId === user?.id)

  const handleDelete = async () => {
    if (!item || !window.confirm('确定删除这条面经吗？')) return
    await api.deleteExperience(item.id)
    navigate('/experiences')
  }

  if (loading) return <Loading text="加载面经..." />

  if (error || !item) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-16 text-center animate-fade-in">
        <p className="text-danger">{error ?? '面经不存在或尚未发布'}</p>
        <Link to="/experiences" className="mt-4 inline-block text-sm text-brand-dark hover:underline">
          返回面经社区
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 lg:px-8 animate-fade-in">
      <Link
        to="/experiences"
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        返回面经社区
      </Link>

      <Card className="overflow-hidden border-border bg-elevated p-0">
        <div className="border-b border-border bg-gradient-to-br from-brand/10 via-elevated to-elevated px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Building2 className="h-5 w-5 shrink-0 text-brand-dark" />
                <h1 className="text-2xl font-bold text-text">
                  {item.company} · {item.position}
                </h1>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={RESULT_VARIANT[item.result] || 'default'}>{item.result}</Badge>
                {item.sourceType === 'simulation' && <Badge variant="info">模拟面经</Badge>}
                {item.status === 'pending' && canManage && (
                  <Badge variant="warning">审核中</Badge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {item.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {item.date}
                </span>
                <span>{item.rounds} 轮面试</span>
              </div>
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  编辑
                </Button>
                <Button variant="secondary" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              </div>
            )}
          </div>

          {item.summary && (
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">{item.summary}</p>
          )}

          {item.sourceReportId && (
            <div className="mt-4 border-t border-border/60 pt-4">
              <Link to={`/reports/${item.sourceReportId}`}>
                <Button variant="secondary" size="sm">
                  <FileText className="h-4 w-4" />
                  查看原始面试报告
                </Button>
              </Link>
            </div>
          )}
        </div>

        <article className="px-6 py-8 sm:px-8">
          <MarkdownContent source={item.content} headingIdPrefix="exp" />
        </article>
      </Card>

      <ExperienceFormModal
        variant="user"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          if (id) {
            api.getExperience(id).then(setItem).catch(() => {})
          }
        }}
        editing={item}
      />
    </div>
  )
}
