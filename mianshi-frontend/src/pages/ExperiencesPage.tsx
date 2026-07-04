import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Building2, User, Calendar, Sparkles, FileText } from 'lucide-react'
import { api, type Experience } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loading, EmptyState } from '../components/ui/Loading'
import { ExperienceFormModal } from '../components/experiences/ExperienceFormModal'

const RESULT_VARIANT: Record<string, 'success' | 'warning' | 'danger'> = {
  通过: 'success',
  待定: 'warning',
  未通过: 'danger',
}

type Filter = 'all' | 'simulation' | 'real'

export function ExperiencesPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Experience | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listExperiences()
      setItems(res.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (filter === 'simulation') return items.filter((e) => e.sourceType === 'simulation')
    if (filter === 'real') return items.filter((e) => e.sourceType !== 'simulation')
    return items
  }, [items, filter])

  const canManage = (exp: Experience) => user?.role === 'admin' || exp.userId === user?.id

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (exp: Experience) => {
    setEditing(exp)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这条面经吗？')) return
    await api.deleteExperience(id)
    load()
  }

  const handleGenerate = async (id: string) => {
    await api.generateQuestionsFromExperience(id)
    window.alert('已生成候选题，请到运营后台「候选题」审核入库')
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'simulation', label: '模拟面经' },
    { id: 'real', label: '真实面经' },
  ]

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10 lg:px-8 animate-fade-in">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-brand/10 via-elevated to-elevated p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">面经社区</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
              在这里分享面试经历、阅读他人复盘。完成模拟面试后，可将报告一键整理成面经，帮助同岗位同学一起进步。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/reports">
              <Button variant="secondary">
                <FileText className="h-4 w-4" />
                从报告分享
              </Button>
            </Link>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              写面经
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f.id
                ? 'bg-brand text-on-brand'
                : 'border border-border bg-elevated text-text-secondary hover:text-text'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-danger-light px-4 py-2 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <Loading text="加载面经..." />
      ) : filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="📖"
            title="还没有面经"
            description="完成一次模拟面试，在报告页点击「分享到面经社区」，或手动撰写真实面经"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/quick">
                  <Button variant="secondary">去模拟面试</Button>
                </Link>
                <Button onClick={openCreate}>写面经</Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {filtered.map((exp, i) => (
            <Card key={exp.id} className="p-6 animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-brand-dark" />
                    <h3 className="truncate font-semibold text-text">
                      {exp.company} · {exp.position}
                    </h3>
                    <Badge variant={RESULT_VARIANT[exp.result] || 'default'}>{exp.result}</Badge>
                    {exp.sourceType === 'simulation' && (
                      <Badge variant="info">模拟面经</Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {exp.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {exp.date}
                    </span>
                    <span>{exp.rounds} 轮面试</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-secondary">
                    {exp.summary}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    to={`/experiences/${exp.id}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text"
                  >
                    阅读全文
                  </Link>
                  {canManage(exp) && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(exp)}
                        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text"
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleGenerate(exp.id)}
                          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-brand/15 hover:text-brand-dark"
                          title="生成候选题"
                        >
                          <Sparkles className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(exp.id)}
                        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger-light hover:text-danger"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ExperienceFormModal
        variant="user"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
      />
    </div>
  )
}
