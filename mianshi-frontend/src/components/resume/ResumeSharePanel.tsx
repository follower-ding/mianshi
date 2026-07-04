import { useEffect, useState } from 'react'
import { Check, Copy, Download, Globe, Link2, Loader2, Trash2 } from 'lucide-react'
import type { ResumeContent } from '../../api/client'
import { api } from '../../api/client'
import { contentToPlainText } from './resumeUtils'
import { Button } from '../ui/Button'

const EXPIRY_OPTIONS = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 },
  { label: '永不过期', value: 0 },
] as const

function formatExpiresAt(iso?: string | null) {
  if (!iso) return '永不过期'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
}

type Props = {
  content: ResumeContent
  resumeTitle: string
  resumeId?: string | null
  onExport: () => Promise<void>
  onBeforeShare?: () => Promise<void>
  exporting?: boolean
}

export function ResumeSharePanel({
  content,
  resumeTitle,
  resumeId,
  onExport,
  onBeforeShare,
  exporting,
}: Props) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [copiedPublic, setCopiedPublic] = useState(false)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null | undefined>(undefined)
  const [expiresInDays, setExpiresInDays] = useState<number>(30)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  const editUrl =
    typeof window !== 'undefined' && resumeId
      ? `${window.location.origin}/resume/edit?id=${resumeId}`
      : typeof window !== 'undefined'
        ? `${window.location.origin}/resume/edit`
        : '/resume/edit'
  const plainText = contentToPlainText(content)

  useEffect(() => {
    if (!resumeId) {
      setPublicUrl(null)
      setShareExpiresAt(undefined)
      return
    }
    api
      .getResumeShare(resumeId)
      .then((r) => {
        if (r.share?.token) {
          setPublicUrl(`${window.location.origin}/r/${r.share.token}`)
          setShareExpiresAt(r.share.expiresAt ?? null)
        } else {
          setPublicUrl(null)
          setShareExpiresAt(undefined)
        }
      })
      .catch(() => {})
  }, [resumeId])

  const copy = async (text: string, kind: 'link' | 'text' | 'public') => {
    try {
      await navigator.clipboard.writeText(text)
      if (kind === 'link') {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      } else if (kind === 'public') {
        setCopiedPublic(true)
        setTimeout(() => setCopiedPublic(false), 2000)
      } else {
        setCopiedText(true)
        setTimeout(() => setCopiedText(false), 2000)
      }
    } catch {
      /* ignore */
    }
  }

  const createPublicLink = async () => {
    if (!resumeId) return
    setShareLoading(true)
    setShareError(null)
    try {
      await onBeforeShare?.()
      const daysOpt = expiresInDays === 0 ? null : expiresInDays
      const { share } = await api.createResumeShare(resumeId, { expiresInDays: daysOpt })
      const url = `${window.location.origin}/r/${share.token}`
      setPublicUrl(url)
      setShareExpiresAt(share.expiresAt ?? null)
      await copy(url, 'public')
    } catch (e) {
      setShareError(e instanceof Error ? e.message : '创建公开链接失败')
    } finally {
      setShareLoading(false)
    }
  }

  const revokePublicLink = async () => {
    if (!resumeId) return
    setShareLoading(true)
    setShareError(null)
    try {
      await api.revokeResumeShare(resumeId)
      setPublicUrl(null)
      setShareExpiresAt(undefined)
    } catch (e) {
      setShareError(e instanceof Error ? e.message : '撤销失败')
    } finally {
      setShareLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        分享给 HR 请优先<strong className="text-text">导出 PDF</strong>。公开链接为只读快照，无需登录。
      </p>

      <div className="rounded-lg border border-border/50 bg-elevated/40 px-3 py-2 text-[11px] leading-relaxed text-muted">
        <p><strong className="text-text-secondary">服务端 PDF</strong>：推荐投递 HR，排版更稳定。</p>
        <p className="mt-1"><strong className="text-text-secondary">浏览器 PDF</strong>：本机打印另存，无需服务端环境。</p>
      </div>

      {resumeId && (
        <div>
          <label htmlFor="share-expiry" className="mb-1.5 block text-xs font-medium text-text-secondary">
            公开链接有效期
          </label>
          <select
            id="share-expiry"
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
            disabled={shareLoading}
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {publicUrl && shareExpiresAt !== undefined && (
            <p className="mt-1.5 text-[11px] text-muted">
              当前链接到期：{formatExpiresAt(shareExpiresAt)}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Button className="w-full" disabled={exporting} onClick={onExport}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          下载 PDF / 打印
        </Button>

        {resumeId ? (
          publicUrl ? (
            <>
              <Button
                variant="secondary"
                className="w-full"
                disabled={shareLoading}
                onClick={() => copy(publicUrl, 'public')}
              >
                {copiedPublic ? <Check className="h-4 w-4 text-success" /> : <Globe className="h-4 w-4" />}
                {copiedPublic ? '公开链接已复制' : '复制公开链接（HR 可查看）'}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={shareLoading}
                onClick={createPublicLink}
              >
                {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                更新公开快照
              </Button>
              <Button
                variant="secondary"
                className="w-full text-danger"
                disabled={shareLoading}
                onClick={revokePublicLink}
              >
                <Trash2 className="h-4 w-4" /> 撤销公开链接
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              disabled={shareLoading}
              onClick={createPublicLink}
            >
              {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              创建公开链接
            </Button>
          )
        ) : (
          <p className="rounded-lg border border-border/60 bg-elevated/40 px-3 py-2 text-xs text-muted">
            请先保存简历后再创建公开链接
          </p>
        )}

        <Button variant="secondary" className="w-full" onClick={() => copy(editUrl, 'link')}>
          {copiedLink ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
          {copiedLink ? '链接已复制' : '复制编辑页链接（需登录）'}
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          disabled={!plainText.trim()}
          onClick={() => copy(plainText, 'text')}
        >
          {copiedText ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          {copiedText ? '文本已复制' : '复制纯文本简历'}
        </Button>
      </div>

      {shareError && (
        <p className="text-xs text-danger" role="alert">
          {shareError}
        </p>
      )}

      <div className="rounded-xl border border-border/60 bg-elevated/50 p-3">
        <p className="text-[11px] text-muted">当前简历</p>
        <p className="mt-1 truncate text-sm font-medium text-text">{resumeTitle || '我的简历'}</p>
      </div>
    </div>
  )
}
