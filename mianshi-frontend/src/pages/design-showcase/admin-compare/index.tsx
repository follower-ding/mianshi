import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, LayoutGrid, Maximize2 } from 'lucide-react'
import {
  ADMIN_VARIANT_ORDER,
  ADMIN_VARIANTS,
  getStoredAdminVariant,
  storeAdminVariant,
  type AdminVariantId,
} from '../../../components/admin/adminVariants'
import { AdminVariantPreview } from './AdminVariantPreview'

function loadFiraFonts() {
  const url =
    'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Fira+Sans:wght@400;500;600;700&display=swap'
  if (document.querySelector(`link[data-admin-font="fira"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  link.setAttribute('data-admin-font', 'fira')
  document.head.appendChild(link)
}

function TokenSwatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-5 w-5 shrink-0 rounded border border-black/10" style={{ background: hex }} />
      <div>
        <div className="text-[9px] text-neutral-400">{label}</div>
        <div className="font-mono text-[10px] text-neutral-700">{hex}</div>
      </div>
    </div>
  )
}

export default function AdminStyleComparePage() {
  const [view, setView] = useState<'grid' | 'single'>('grid')
  const [active, setActive] = useState<AdminVariantId>('shadcn-admin')
  const [selected, setSelected] = useState<AdminVariantId>(() => getStoredAdminVariant())
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    loadFiraFonts()
  }, [])

  const handleSelect = (id: AdminVariantId) => {
    storeAdminVariant(id)
    setSelected(id)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  const theme = ADMIN_VARIANTS[active]

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <Link
              to="/design"
              className="mb-1 inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-900"
            >
              <ArrowLeft className="h-3 w-3" /> Design Showcase
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl">
              iume · 后台三风格对比
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              Studio Neutral / Slate Console / Data Dense Pro — 侧栏 · 看板 · 列表
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {savedFlash && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <Check className="h-3 w-3" /> 已保存偏好：{ADMIN_VARIANTS[selected].label}
              </span>
            )}
            <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-1">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === 'grid' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                }`}
              >
                <LayoutGrid className="h-3 w-3" /> 三列并排
              </button>
              <button
                type="button"
                onClick={() => setView('single')}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === 'single' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                }`}
              >
                <Maximize2 className="h-3 w-3" /> 单风格详情
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        {view === 'grid' ? (
          <div className="grid gap-6 xl:grid-cols-3">
            {ADMIN_VARIANT_ORDER.map((id) => (
              <div key={id} className="space-y-3">
                <AdminVariantPreview variantId={id} compact />
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-neutral-500">{ADMIN_VARIANTS[id].description}</p>
                  <button
                    type="button"
                    onClick={() => handleSelect(id)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selected === id
                        ? 'bg-teal-700 text-white'
                        : 'border border-neutral-200 bg-white text-neutral-700 hover:border-teal-300 hover:text-teal-700'
                    }`}
                  >
                    {selected === id ? '当前选用' : '选用此风格'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {ADMIN_VARIANT_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActive(id)}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    active === id
                      ? 'bg-neutral-900 text-white'
                      : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {ADMIN_VARIANTS[id].label}
                </button>
              ))}
            </div>

            <AdminVariantPreview variantId={active} />

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="text-sm font-bold text-neutral-900">{theme.label}</h3>
                <p className="mt-1 text-sm text-neutral-500">{theme.description}</p>
                <p className="mt-2 text-xs text-neutral-400">参考：{theme.reference}</p>
                <button
                  type="button"
                  onClick={() => handleSelect(active)}
                  className="mt-4 cursor-pointer rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  选用 {theme.label}
                </button>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-bold text-neutral-900">核心 Token</h3>
                <div className="grid grid-cols-2 gap-3">
                  <TokenSwatch label="page" hex={theme.tokens['--color-admin-page']} />
                  <TokenSwatch label="brand" hex={theme.tokens['--color-admin-brand']} />
                  <TokenSwatch label="sidebar" hex={theme.tokens['--color-admin-sidebar-bg']} />
                  <TokenSwatch label="surface" hex={theme.tokens['--color-admin-surface']} />
                </div>
                <dl className="mt-4 space-y-1 text-xs text-neutral-600">
                  <div className="flex justify-between">
                    <dt>侧栏宽度</dt>
                    <dd className="font-mono">{theme.layout.sidebarWidth}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>行高</dt>
                    <dd className="font-mono">{theme.layout.tableRowPy}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>卡片圆角</dt>
                    <dd className="font-mono">{theme.layout.cardRadius}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-neutral-400">
          选定风格后告知 Agent，将把偏好应用到真实 <code className="rounded bg-neutral-200 px-1">/admin/**</code> 页面
        </p>
      </main>
    </div>
  )
}
