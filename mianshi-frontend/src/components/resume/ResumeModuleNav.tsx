import { NavLink, useLocation } from 'react-router-dom'
import { Sparkles, Wand2, LayoutTemplate, FileText, HelpCircle, Images } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { RESUME_MODULES, type ResumeModule } from './resumeSections'
import { resumeUi } from './resumeLayout'

const ICONS: Record<ResumeModule, LucideIcon> = {
  mine: FileText,
  generate: Sparkles,
  optimize: Wand2,
  edit: LayoutTemplate,
}

const EXTRA_LINKS = [
  { path: '/resume/templates', label: '模板', icon: Images },
  { path: '/resume/help', label: '帮助', icon: HelpCircle },
] as const

function isModuleActive(pathname: string, moduleId: ResumeModule, modulePath: string) {
  if (moduleId === 'mine') {
    return pathname === '/resume' || pathname === '/resume/mine'
  }
  return pathname.startsWith(modulePath)
}

function tabClass(isActive: boolean) {
  return `relative flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'border-brand text-brand'
      : 'border-transparent text-text-secondary hover:border-border/80 hover:text-text'
  }`
}

export function ResumeModuleNav() {
  const { pathname } = useLocation()

  return (
    <nav className={resumeUi.moduleRail} data-onboard="module-nav" aria-label="简历功能">
      {RESUME_MODULES.map((m) => {
        const Icon = ICONS[m.id]
        const isActive = isModuleActive(pathname, m.id, m.path)
        return (
          <NavLink key={m.id} to={m.path} className={tabClass(isActive)}>
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {m.label}
            {m.id === 'generate' && (
              <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-brand">
                AI
              </span>
            )}
          </NavLink>
        )
      })}
      {EXTRA_LINKS.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={tabClass(pathname.startsWith(path))}
        >
          <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
