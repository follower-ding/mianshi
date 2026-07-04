import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { FloatingSidebar } from './FloatingSidebar'

export function AppLayout() {
  const { pathname } = useLocation()
  const isImmersive =
    pathname.startsWith('/questions') || pathname === '/jobs' || pathname.startsWith('/resume')
  const hideSiteHeader = pathname.startsWith('/resume')

  return (
    <div className="min-h-screen bg-page">
      {!hideSiteHeader && <Header />}
      <main>
        <Outlet />
      </main>
      {!isImmersive && <FloatingSidebar />}
    </div>
  )
}
