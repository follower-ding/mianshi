import {
  LayoutDashboard,
  Settings2,
  FileQuestion,
  Users,
  Search,
  Plus,
  Pencil,
  Eye,
  BookOpen,
  Clock,
  CheckCircle2,
  Shield,
} from 'lucide-react'
import {
  ADMIN_VARIANTS,
  adminVariantStyle,
  isDarkSidebar,
  type AdminVariantId,
} from '../../../components/admin/adminVariants'

const NAV = [
  { label: '数据看板', icon: LayoutDashboard, active: true },
  { label: '题库管理', icon: Settings2 },
  { label: '审核队列', icon: FileQuestion, badge: 3 },
  { label: '用户管理', icon: Users },
]

const TABLE_ROWS = [
  { id: 'Q-1042', title: 'Redis 持久化 RDB 与 AOF 区别', cat: '中间件', diff: '中等', status: '已发布' },
  { id: 'Q-1038', title: 'JVM 内存模型与 happens-before', cat: 'Java', diff: '困难', status: '审核中' },
]

function Pill({ children, tone }: { children: React.ReactNode; tone: 'violet' | 'sky' | 'amber' | 'emerald' | 'slate' }) {
  const map = {
    violet: 'bg-violet-50 text-violet-700 ring-violet-200/50',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200/60',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200/60',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${map[tone]}`}>
      {children}
    </span>
  )
}

type Props = {
  variantId: AdminVariantId
  compact?: boolean
}

export function AdminVariantPreview({ variantId, compact = false }: Props) {
  const v = ADMIN_VARIANTS[variantId]
  const dark = isDarkSidebar(variantId)
  const dense = variantId === 'data-dense'

  return (
    <div
      data-admin-variant={variantId}
      data-surface="admin"
      className="overflow-hidden rounded-xl border border-neutral-200 bg-[var(--color-admin-page)] shadow-lg"
      style={adminVariantStyle(variantId)}
    >
      {/* Label bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2.5">
        <div>
          <p className="text-sm font-bold text-neutral-900">{v.label}</p>
          <p className="text-[11px] text-neutral-500">{v.tagline} · {v.reference}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
          Preview
        </span>
      </div>

      <div className="flex" style={{ height: compact ? 480 : 560 }}>
        {/* Sidebar */}
        <aside
          className="flex shrink-0 flex-col border-r"
          style={{
            width: v.layout.sidebarWidth,
            background: 'var(--color-admin-sidebar-bg)',
            borderColor: 'var(--color-admin-sidebar-border, var(--color-admin-border))',
          }}
        >
          <div
            className="flex items-center gap-2.5 border-b px-4 py-3"
            style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : 'var(--color-admin-border)' }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: dark ? 'rgba(34,211,238,0.15)' : 'var(--color-admin-brand-light)',
                color: dark ? '#22d3ee' : 'var(--color-admin-brand)',
              }}
            >
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0 leading-tight">
              <p
                className="truncate text-xs font-bold"
                style={{ color: dark ? '#f8fafc' : 'var(--color-admin-text)' }}
              >
                iume
              </p>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-admin-sidebar-text)' }}>
                Admin
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 p-2">
            {NAV.map(({ label, icon: Icon, active, badge }) => (
              <div
                key={label}
                className="relative flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] font-medium transition-colors"
                style={{
                  background: active
                    ? dark
                      ? 'var(--color-admin-sidebar-hover)'
                      : 'var(--color-admin-brand-light)'
                    : 'transparent',
                  color: active
                    ? 'var(--color-admin-sidebar-text-active)'
                    : 'var(--color-admin-sidebar-text)',
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
                    style={{ background: 'var(--color-admin-sidebar-indicator)' }}
                  />
                )}
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span className="flex-1 truncate">{label}</span>
                {badge != null && badge > 0 && (
                  <span
                    className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{ background: 'var(--color-admin-brand)' }}
                  >
                    {badge}
                  </span>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 overflow-y-auto" style={{ padding: v.layout.pagePadding }}>
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2
                className="font-bold tracking-tight text-[var(--color-admin-text)]"
                style={{ fontSize: dense ? '16px' : '18px' }}
              >
                运营概览
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--color-admin-text-secondary)]">
                题库 2,847 题 · 6 个方向
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-admin-brand)' }}
            >
              <Plus className="h-3 w-3" />
              新增题目
            </button>
          </div>

          {/* Stats */}
          <div
            className="mb-4 grid grid-cols-3 gap-2"
            style={{ gap: dense ? '8px' : '12px' }}
          >
            {[
              { label: '题库总量', value: '2,847', icon: BookOpen },
              { label: '待审核', value: '12', icon: Clock },
              { label: '完成率', value: '94%', icon: CheckCircle2 },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="border bg-[var(--color-admin-surface)]"
                style={{
                  borderRadius: v.layout.cardRadius,
                  borderColor: 'var(--color-admin-border)',
                  boxShadow: 'var(--shadow-admin-card)',
                  padding: dense ? '10px' : '14px',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[var(--color-admin-muted)]">{label}</p>
                    <p
                      className="font-bold tabular-nums text-[var(--color-admin-text)]"
                      style={{ fontSize: dense ? '16px' : '18px', fontFamily: dense ? 'var(--font-mono, monospace)' : undefined }}
                    >
                      {value}
                    </p>
                  </div>
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ background: 'var(--color-admin-brand-light)', color: 'var(--color-admin-brand)' }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter card */}
          <div
            className="mb-3 border bg-[var(--color-admin-surface)]"
            style={{
              borderRadius: v.layout.cardRadius,
              borderColor: 'var(--color-admin-border)',
              boxShadow: 'var(--shadow-admin-card)',
              padding: dense ? '10px' : '14px',
            }}
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-admin-muted)]" />
                <input
                  readOnly
                  placeholder="搜索题目..."
                  className="w-full rounded-lg border py-1.5 pl-8 pr-2 text-[11px] outline-none"
                  style={{
                    borderColor: 'var(--color-admin-border)',
                    background: 'var(--color-admin-surface)',
                    color: 'var(--color-admin-text)',
                  }}
                />
              </div>
              <select
                className="rounded-lg border px-2 text-[11px]"
                style={{ borderColor: 'var(--color-admin-border)', color: 'var(--color-admin-text-secondary)' }}
              >
                <option>全部状态</option>
              </select>
            </div>
            <div className="mt-2 flex gap-3 border-t pt-2" style={{ borderColor: 'var(--color-admin-border-light)' }}>
              {['全部 (63)', '已发布', '审核中'].map((tab, i) => (
                <span
                  key={tab}
                  className="relative cursor-pointer pb-1 text-[10px] font-medium"
                  style={{
                    color: i === 0 ? 'var(--color-admin-brand)' : 'var(--color-admin-muted)',
                  }}
                >
                  {tab}
                  {i === 0 && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: 'var(--color-admin-brand)' }}
                    />
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Table */}
          <div
            className="overflow-hidden border bg-[var(--color-admin-surface)]"
            style={{
              borderRadius: v.layout.cardRadius,
              borderColor: 'var(--color-admin-border)',
              boxShadow: 'var(--shadow-admin-card-hover)',
            }}
          >
            <table className="w-full text-left">
              <thead style={{ background: 'var(--color-admin-thead)' }}>
                <tr>
                  {['题目', '方向', '难度', '状态', '操作'].map((h) => (
                    <th
                      key={h}
                      className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-admin-muted)]"
                      style={{ paddingTop: dense ? '8px' : '12px', paddingBottom: dense ? '8px' : '12px' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t transition-colors hover:bg-[var(--color-admin-row-hover)]"
                    style={{
                      borderColor: 'var(--color-admin-border-light)',
                    }}
                  >
                    <td className="px-3" style={{ paddingTop: v.layout.tableRowPy, paddingBottom: v.layout.tableRowPy }}>
                      <p className="text-[11px] font-semibold text-[var(--color-admin-text)]">{row.title}</p>
                      <p
                        className="text-[9px] text-[var(--color-admin-muted)]"
                        style={{ fontFamily: dense ? '"Fira Code", monospace' : undefined }}
                      >
                        {row.id}
                      </p>
                    </td>
                    <td className="px-3"><Pill tone="violet">{row.cat}</Pill></td>
                    <td className="px-3">
                      <Pill tone={row.diff === '困难' ? 'amber' : 'sky'}>{row.diff}</Pill>
                    </td>
                    <td className="px-3">
                      <Pill tone={row.status === '已发布' ? 'emerald' : 'slate'}>{row.status}</Pill>
                    </td>
                    <td className="px-3">
                      <div className="flex gap-0.5">
                        {[Eye, Pencil].map((Icon, i) => (
                          <span
                            key={i}
                            className="inline-flex rounded p-1 text-[var(--color-admin-muted)] hover:bg-[var(--color-admin-brand-light)] hover:text-[var(--color-admin-brand)]"
                          >
                            <Icon className="h-3 w-3" strokeWidth={1.75} />
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
