import { Navigate, Outlet } from 'react-router-dom'
import { resumeUi } from '../../components/resume/resumeLayout'
import { ResumeShellSkeleton, ResumeMineSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import { ResumeProvider, useResume } from './ResumeProvider'
import { ResumeShellHeader } from './ResumeShellHeader'
import { ResumeLoginGate } from './ResumeLoginGate'

function ResumeLayoutInner() {
  const { loading } = useResume()

  if (loading) {
    return (
      <div className={resumeUi.workspace}>
        <ResumeShellSkeleton />
        <ResumeMineSkeleton />
      </div>
    )
  }

  return (
    <div className={`${resumeUi.workspace} animate-fade-in`}>
      <ResumeShellHeader />
      <Outlet />
    </div>
  )
}

export function ResumeLayout() {
  const { user, loading: authLoading, authEnabled } = useAuth()

  if (authLoading) {
    return (
      <div className={resumeUi.workspace}>
        <ResumeShellSkeleton />
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    )
  }
  if (authEnabled && !user) return <ResumeLoginGate />

  return (
    <ResumeProvider>
      <ResumeLayoutInner />
    </ResumeProvider>
  )
}

export function ResumeIndexRedirect() {
  return <Navigate to="/resume/mine" replace />
}
