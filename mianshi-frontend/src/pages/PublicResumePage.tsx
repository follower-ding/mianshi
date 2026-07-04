import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, FileText, Link2Off } from 'lucide-react'
import { api, ApiError, type ResumeContent, type ResumeLayoutConfig } from '../api/client'
import { ProMinimalPreview } from '../components/resume/ProMinimalPreview'
import { layoutFromConfig } from '../components/resume/resumeLayoutConfig'
import { isValidTemplateId } from '../components/resume/resumeUtils'
import { settingsToPaperStyle } from '../components/resume/resumePreviewSettings'
import type { ResumeTemplateId } from '../lib/data'
import { normalizeSectionOrder, normalizeSectionVisibility } from '../components/resume/resumeSections'
import { BRAND } from '../lib/brand'
import { PublicResumeSkeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'

type PublicResume = {
  title: string
  templateId: string
  content: ResumeContent
  layoutConfig?: ResumeLayoutConfig
  sharedAt: string
  expiresAt?: string | null
}

type LoadError = 'expired' | 'invalid' | 'generic'

function formatExpiresAt(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
}

export function PublicResumePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicResume | null>(null)
  const [loadError, setLoadError] = useState<LoadError | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [expiredAt, setExpiredAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setLoadError(null)
    setErrorDetail(null)
    api
      .getPublicResume(token)
      .then(setData)
      .catch((e) => {
        if (e instanceof ApiError && e.code === 'SHARE_EXPIRED') {
          setLoadError('expired')
          setErrorDetail(e.message)
          setExpiredAt(e.expiresAt ?? null)
        } else if (e instanceof ApiError && e.code === 'SHARE_NOT_FOUND') {
          setLoadError('invalid')
          setErrorDetail(e.message)
        } else {
          setLoadError('generic')
          setErrorDetail(e instanceof Error ? e.message : '加载失败')
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  const layout = useMemo(() => layoutFromConfig(data?.layoutConfig), [data?.layoutConfig])
  const templateId: ResumeTemplateId =
    data?.templateId && isValidTemplateId(data.templateId) ? data.templateId : 'tech-simple'
  const sectionOrder = normalizeSectionOrder(layout.sectionOrder)
  const sectionVisibility = normalizeSectionVisibility(layout.sectionVisibility)
  const visibleOrder = sectionOrder.filter((k) => sectionVisibility[k] !== false)

  if (loading) return <PublicResumeSkeleton />

  if (loadError || !data) {
    const isExpired = loadError === 'expired'
    const isInvalid = loadError === 'invalid'
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-page px-4">
        <span
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
            isExpired ? 'bg-amber-500/10 text-amber-600' : 'bg-muted/20 text-muted'
          }`}
        >
          {isExpired ? <Clock className="h-7 w-7" /> : <Link2Off className="h-7 w-7" />}
        </span>
        <h1 className="text-lg font-semibold text-text">
          {isExpired ? '链接已过期' : isInvalid ? '链接无效' : '无法打开简历'}
        </h1>
        <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
          {isExpired
            ? '该公开链接已超过有效期，请联系分享者重新生成链接。'
            : isInvalid
              ? '链接不存在或已被撤销，请向分享者确认最新链接。'
              : (errorDetail ?? '加载失败')}
        </p>
        {isExpired && expiredAt && (
          <p className="mt-1 text-xs text-muted">过期时间：{formatExpiresAt(expiredAt)}</p>
        )}
        <Link to="/" className="mt-6">
          <Button>返回首页</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-resume-canvas">
      <header className="border-b border-border/60 bg-panel/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-text">{data.title}</h1>
              <p className="text-xs text-muted">
                公开只读 · {BRAND.displayName}
                {data.expiresAt ? ` · 链接 ${formatExpiresAt(data.expiresAt)} 前有效` : ''}
              </p>
            </div>
          </div>
          <Link to="/">
            <Button variant="secondary" size="sm">
              我也要做简历
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-4 py-8">
        <div
          className="mx-auto overflow-hidden rounded-sm bg-resume-paper shadow-lg"
          style={settingsToPaperStyle(layout.previewSettings)}
        >
          <ProMinimalPreview
            content={data.content}
            templateId={templateId}
            previewSettings={layout.previewSettings}
            sectionOrder={visibleOrder}
            publicSafe
          />
        </div>
      </main>
    </div>
  )
}
