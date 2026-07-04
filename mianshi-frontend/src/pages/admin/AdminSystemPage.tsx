import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, Trash2, CheckCircle2, XCircle, ShieldCheck,
  Activity, Cpu, FileText, Mic, Server, Zap, AlertTriangle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, type AdminMetrics, type QualityRegressionReport } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { AdminStatCard } from '../../components/admin/AdminStatCard'
import { AdminCard } from '../../components/admin/AdminCard'
import {
  AdminKpiTile,
  AdminDonutChart,
  AdminBarChart,
  AdminChartCard,
  AdminSegmentBar,
} from '../../components/admin/AdminCharts'
import { adminZincColor } from '../../components/admin/adminChartColors'
import { AdminButton } from '../../components/admin/AdminButton'
import { Loading } from '../../components/ui/Loading'

const COUNTER_LABELS: Record<string, string> = {
  'interview.session_started': '面试开始',
  'interview.session_finished': '面试完成',
  'interview.round_scored': '回合评分',
  'interview.llm_fallback': 'LLM 降级',
  'interview.follow_up': '追问次数',
  'scoring.rule_only': '纯规则评分',
  'scoring.llm_blended': '混合评分',
  'llm.cache_hit': '缓存命中',
  'llm.cache_miss': '缓存未中',
  'llm.request': 'LLM 请求',
  'llm.stream': '流式请求',
  'resume.upload': '简历上传',
  'resume.extract': '文本提取',
  'resume.parse': '智能识别',
  'resume.parse_text': '解析(parse_text)',
  'resume.generate': 'AI 生成',
  'resume.export': '导出(合计)',
  'resume.export_pdf': '服务端 PDF',
  'resume.export_client': '客户端导出',
  'resume.optimize': '全文优化',
  'resume.optimize_for_job': '定向优化',
  'resume.share': '公开分享',
}

const INTERVIEW_KEYS = [
  'interview.session_started',
  'interview.session_finished',
  'interview.round_scored',
  'interview.llm_fallback',
  'interview.follow_up',
] as const

const RESUME_METRIC_KEYS = [
  'resume.upload',
  'resume.parse',
  'resume.generate',
  'resume.export',
  'resume.export_pdf',
  'resume.export_client',
] as const

export function AdminSystemPage() {
  const { showToast } = useToast()
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [gateway, setGateway] = useState<{
    hits: number
    misses: number
    hitRate: number
    variantUsage: Record<string, number>
  } | null>(null)
  const [health, setHealth] = useState<'ok' | 'fail' | 'checking'>('checking')
  const [purging, setPurging] = useState(false)
  const [regression, setRegression] = useState<QualityRegressionReport | null>(null)
  const [runningRegression, setRunningRegression] = useState(false)

  const load = useCallback(async () => {
    setHealth('checking')
    try {
      const [m, g] = await Promise.all([api.getAdminMetrics(), api.getAdminGateway()])
      setMetrics(m)
      setGateway(g)
      const h = await fetch('/api/health')
      setHealth(h.ok ? 'ok' : 'fail')
    } catch {
      setHealth('fail')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handlePurgeCache = async () => {
    setPurging(true)
    try {
      const res = await api.purgeAdminCache()
      showToast(res.message ?? '已清理过期 LLM 缓存', 'success')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '清理失败', 'error')
    } finally {
      setPurging(false)
    }
  }

  const handleQualityRegression = async () => {
    setRunningRegression(true)
    try {
      const report = await api.runQualityRegression()
      setRegression(report)
      showToast(`检测完成：${report.passed}/${report.total} 通过`, 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '检测失败', 'error')
    } finally {
      setRunningRegression(false)
    }
  }

  const interviewBars = useMemo(() => {
    if (!metrics) return []
    return INTERVIEW_KEYS.map((key, i) => ({
      label: COUNTER_LABELS[key] ?? key,
      value: typeof metrics[key] === 'number' ? (metrics[key] as number) : 0,
      color: adminZincColor(i),
    }))
  }, [metrics])

  const resumeBars = useMemo(() => {
    if (!metrics) return []
    return RESUME_METRIC_KEYS.map((key, i) => ({
      label: COUNTER_LABELS[key] ?? key,
      value: typeof metrics[key] === 'number' ? (metrics[key] as number) : 0,
      color: adminZincColor(i + 2),
    }))
  }, [metrics])

  const llmSegments = useMemo(() => {
    if (!gateway) return []
    return [
      { label: '命中', value: gateway.hits, color: '#fafafa' },
      { label: '未中', value: gateway.misses, color: '#71717a' },
    ]
  }, [gateway])

  if (!metrics) return <Loading text="加载系统指标..." />

  const q = metrics.quality

  return (
    <div className="space-y-4">
      <AdminPageToolbar
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </AdminButton>
            <AdminButton size="sm" variant="secondary" disabled={purging} onClick={handlePurgeCache}>
              <Trash2 className="h-4 w-4" />
              {purging ? '清理中...' : '清理缓存'}
            </AdminButton>
            <AdminButton size="sm" disabled={runningRegression} onClick={handleQualityRegression}>
              <ShieldCheck className="h-4 w-4" />
              {runningRegression ? '检测中...' : '质量检测'}
            </AdminButton>
          </div>
        }
      />

      {/* Health banner */}
      <div
        className={`flex items-center gap-4 rounded-lg border p-5 ${
          health === 'ok'
            ? 'border-emerald-900/40 bg-emerald-950/20'
            : health === 'fail'
              ? 'border-red-900/40 bg-red-950/20'
              : 'border-admin-border bg-admin-surface'
        }`}
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
            health === 'ok' ? 'bg-emerald-600' : health === 'fail' ? 'bg-red-600' : 'bg-admin-surface-alt'
          }`}
        >
          {health === 'ok' ? (
            <CheckCircle2 className="h-6 w-6 text-white" />
          ) : health === 'fail' ? (
            <XCircle className="h-6 w-6 text-white" />
          ) : (
            <Activity className="h-6 w-6 animate-pulse text-white" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-base font-bold text-[var(--color-admin-text)]">
            API 状态：{health === 'checking' ? '检测中...' : health === 'ok' ? '运行正常' : '服务异常'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-admin-muted)]">GET /api/health · 实时探测</p>
        </div>
        <Server className="h-8 w-8 text-[var(--color-admin-muted)] opacity-30" />
      </div>

      {/* Quality KPIs */}
      {q && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AdminKpiTile label="会话完成率" value={`${q.sessionCompletionRate}%`} icon={CheckCircle2} />
          <AdminKpiTile label="LLM 缓存命中" value={`${q.llmCacheHitRate}%`} icon={Zap} />
          <AdminKpiTile label="LLM 降级率" value={`${q.llmFallbackRate}%`} icon={AlertTriangle} />
          <AdminKpiTile label="Rubric 完整会话" value={q.sessionsWithFullRubric} icon={Mic} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AdminChartCard className="lg:col-span-1">
          {gateway && (
            <>
              <AdminDonutChart
                title="LLM 缓存"
                icon={Cpu}
                segments={llmSegments}
                centerValue={`${gateway.hitRate}%`}
                centerLabel="命中率"
              />
              <div className="mt-4">
                <AdminSegmentBar segments={llmSegments} height={8} />
              </div>
            </>
          )}
        </AdminChartCard>

        <AdminChartCard className="lg:col-span-2">
          <AdminBarChart title="面试引擎事件" icon={Mic} items={interviewBars} showPct={false} />
        </AdminChartCard>
      </div>

      <AdminChartCard>
        <AdminBarChart title="简历模块事件" icon={FileText} items={resumeBars} showPct={false} />
      </AdminChartCard>

      {/* Regression report */}
      {regression && (
        <AdminCard compact title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--color-admin-brand)]" />
            题库质量检测报告
          </span>
        }>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminStatCard label="检测题目" value={regression.total} icon={FileText} />
            <AdminStatCard label="通过" value={regression.passed} icon={CheckCircle2} />
            <AdminStatCard label="异常" value={regression.failed} icon={AlertTriangle} />
          </div>

          {regression.items.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-admin-muted)]">
                字段/内容问题
              </p>
              <ul className="space-y-2">
                {regression.items.map((item) => (
                  <li key={item.id} className="rounded-lg border border-[var(--color-admin-border-light)] px-3 py-2 text-sm">
                    <Link to="/admin/manage" className="font-medium text-[var(--color-admin-brand)] hover:underline">
                      {item.title}
                    </Link>
                    <ul className="mt-1 list-inside list-disc text-[11px] text-[var(--color-admin-muted)]">
                      {item.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {regression.failed === 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              全部 published/review 题目通过质量检测
            </p>
          )}
        </AdminCard>
      )}

      {/* All counters grouped */}
      <AdminCard compact title={
        <span className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--color-admin-brand)]" />
          全量事件计数器
        </span>
      }>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(metrics)
            .filter(([k, v]) => typeof v === 'number' && COUNTER_LABELS[k])
            .map(([key, val]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-[var(--color-admin-border-light)] bg-[var(--color-admin-surface-alt)] px-3 py-2.5 transition-colors hover:border-[var(--color-admin-brand)]/20"
              >
                <span className="text-[11px] text-[var(--color-admin-text-secondary)]">
                  {COUNTER_LABELS[key] ?? key}
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-[var(--color-admin-brand)]">
                  {val as number}
                </span>
              </div>
            ))}
        </div>
        {metrics.collectedAt && (
          <p className="mt-4 text-[11px] text-[var(--color-admin-muted)]">
            采集时间：{new Date(String(metrics.collectedAt)).toLocaleString('zh-CN')}
          </p>
        )}
      </AdminCard>
    </div>
  )
}
