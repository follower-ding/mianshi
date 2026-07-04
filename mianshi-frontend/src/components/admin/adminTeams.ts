import { Building2, FlaskConical, Rocket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AdminTeam = {
  id: string
  name: string
  plan: string
  icon: LucideIcon
}

export const ADMIN_TEAMS: AdminTeam[] = [
  { id: 'prod', name: 'iume Admin', plan: 'Production', icon: Rocket },
  { id: 'staging', name: 'iume Staging', plan: 'Staging', icon: FlaskConical },
  { id: 'demo', name: 'Demo Workspace', plan: 'Demo', icon: Building2 },
]

export const ADMIN_TEAM_KEY = 'mianshi-admin-team'

export function readAdminTeamId(): string {
  try {
    const v = localStorage.getItem(ADMIN_TEAM_KEY)
    if (v && ADMIN_TEAMS.some((t) => t.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'prod'
}

export function getAdminTeam(id: string): AdminTeam {
  return ADMIN_TEAMS.find((t) => t.id === id) ?? ADMIN_TEAMS[0]
}

export function storeAdminTeamId(id: string) {
  try {
    localStorage.setItem(ADMIN_TEAM_KEY, id)
  } catch {
    /* ignore */
  }
}
