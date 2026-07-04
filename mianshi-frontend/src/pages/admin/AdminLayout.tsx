import { useEffect, useState, type CSSProperties } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { Loading } from '../../components/ui/Loading'
import { AdminHeader } from '../../components/admin/AdminHeader'
import { AdminSidebar, AdminMobileNav } from '../../components/admin/AdminSidebar'
import { AdminShellProvider, useAdminShell } from '../../components/admin/AdminShellContext'
import { AdminCommandPalette } from '../../components/admin/AdminCommandPalette'
import { adminColorModeTokens } from '../../components/admin/adminColorMode'
import { adminCx } from '../../components/admin/adminTheme'
import {
  adminVariantStyle,
  getAdminDesignVariant,
  type AdminVariantId,
} from '../../components/admin/adminVariants'

const ADMIN_DESIGN: AdminVariantId = getAdminDesignVariant()

function adminShellStyle(colorMode: 'dark' | 'light'): CSSProperties {
  return {
    ...adminVariantStyle(ADMIN_DESIGN),
    ...adminColorModeTokens(colorMode),
  } as CSSProperties
}

function AdminLayoutInner() {
  const { user, loading } = useAuth()
  const { colorMode } = useAdminShell()
  const [pendingReview, setPendingReview] = useState(0)
  const [pendingCandidates, setPendingCandidates] = useState(0)

  useEffect(() => {
    if (user?.role !== 'admin') return
    Promise.all([
      api.listReviewQuestions('review').catch(() => ({ items: [] })),
      api.listCandidates('review').catch(() => ({ items: [] })),
    ]).then(([q, c]) => {
      setPendingReview(q.items.length)
      setPendingCandidates(c.items.length)
    })
  }, [user?.role])

  const shellStyle = adminShellStyle(colorMode)

  if (loading) {
    return (
      <div
        className={`flex h-screen items-center justify-center ${adminCx.page}`}
        data-surface="admin"
        data-admin-variant={ADMIN_DESIGN}
        data-admin-color-mode={colorMode}
        style={shellStyle}
      >
        <Loading text="加载后台..." />
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  const badgeProps = { pendingReview, pendingCandidates }

  return (
    <div
      className={`flex h-screen overflow-hidden ${adminCx.page}`}
      data-surface="admin"
      data-admin-variant={ADMIN_DESIGN}
      data-admin-color-mode={colorMode}
      style={shellStyle}
    >
      <AdminSidebar {...badgeProps} />
      <AdminMobileNav {...badgeProps} />
      <AdminCommandPalette />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="admin-main-inset p-4 md:p-6">
            <Outlet
              context={{
                refreshBadges: () => {
                  Promise.all([
                    api.listReviewQuestions('review'),
                    api.listCandidates('review'),
                  ]).then(([q, c]) => {
                    setPendingReview(q.items.length)
                    setPendingCandidates(c.items.length)
                  })
                },
              }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export function AdminLayout() {
  return (
    <AdminShellProvider>
      <AdminLayoutInner />
    </AdminShellProvider>
  )
}
