import { Component, Suspense, type ReactNode } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { Loading } from './components/ui/Loading'
import { Button } from './components/ui/Button'
import * as Lazy from './routes/lazyPages'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg-page">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text">页面出错了</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {this.state.error?.message ?? '发生了意外错误'}
            </p>
            <Link to="/" className="mt-6 inline-block">
              <Button>返回首页</Button>
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-text">404</h1>
        <p className="mt-2 text-lg text-text-secondary">页面不存在</p>
        <Link to="/" className="mt-6 inline-block">
          <Button>返回首页</Button>
        </Link>
      </div>
    </div>
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loading />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="quick" element={<Lazy.QuickInterviewPage />} />
            <Route path="interview" element={<Lazy.InterviewPage />} />
            <Route path="reports" element={<Lazy.ReportsPage />} />
            <Route path="reports/:id" element={<Lazy.ReportDetailPage />} />
            <Route path="resume" element={<Lazy.ResumeLayout />}>
              <Route index element={<Lazy.ResumeIndexRedirect />} />
              <Route path="mine" element={<Lazy.ResumeMineView />} />
              <Route path="generate" element={<Lazy.GenerateView />} />
              <Route path="optimize" element={<Lazy.OptimizeView />} />
              <Route path="share" element={<Navigate to="/resume/edit" replace />} />
              <Route path="edit" element={<Lazy.EditView />} />
              <Route path="templates" element={<Lazy.TemplatesView />} />
              <Route path="help" element={<Lazy.HelpView />} />
            </Route>
            <Route path="questions" element={<Lazy.QuestionBankHubPage />} />
            <Route path="questions/:bankSlug" element={<Lazy.QuestionBankPage />} />
            <Route path="paths" element={<Lazy.PathsPage />} />
            <Route path="experiences" element={<Lazy.ExperiencesPage />} />
            <Route path="experiences/:id" element={<Lazy.ExperienceDetailPage />} />
            <Route path="jobs" element={<Lazy.JobsPage />} />
            <Route path="jobs/messages" element={<Lazy.BossMessagesPage />} />
            <Route path="jobs/:id" element={<Lazy.JobDetailPage />} />
            <Route path="invite" element={<Lazy.InvitePage />} />
            <Route path="login" element={<Lazy.LoginPage />} />
            <Route path="register" element={<Lazy.RegisterPage />} />
            <Route path="profile" element={<Lazy.ProfilePage />} />
          </Route>
          <Route path="admin" element={<Lazy.AdminLayout />}>
            <Route index element={<Lazy.AdminDashboardPage />} />
            <Route path="questions" element={<Lazy.AdminQuestionsPage />} />
            <Route path="import" element={<Lazy.AdminImportPage />} />
            <Route path="manage" element={<Lazy.AdminQuestionManagePage />} />
            <Route path="manage/:id" element={<Lazy.AdminQuestionEditPage />} />
            <Route path="candidates" element={<Lazy.AdminCandidatesPage />} />
            <Route path="experiences" element={<Lazy.AdminExperiencesPage />} />
            <Route path="reports" element={<Lazy.AdminReportsPage />} />
            <Route path="users" element={<Lazy.AdminUsersPage />} />
            <Route path="users/:id" element={<Lazy.AdminUserDetailPage />} />
            <Route path="resume-shares" element={<Lazy.AdminResumeSharesPage />} />
            <Route path="jobs" element={<Lazy.AdminJobsPage />} />
            <Route path="system" element={<Lazy.AdminSystemPage />} />
            <Route path="settings" element={<Lazy.AdminSettingsPage />} />
            <Route path="*" element={<Lazy.AdminNotFoundPage />} />
          </Route>
          <Route path="/design" element={<Lazy.DesignShowcaseHub />} />
          <Route path="/design/minimal" element={<Lazy.MinimalMicroInteractions />} />
          <Route path="/design/glassmorphism" element={<Lazy.GlassmorphismPage />} />
          <Route path="/design/neumorphism" element={<Lazy.NeumorphismPage />} />
          <Route path="/design/brutalism" element={<Lazy.BrutalismPage />} />
          <Route path="/design/ai-native" element={<Lazy.AiNativePage />} />
          <Route path="/design/mianshi" element={<Lazy.MianshiStyleComparePage />} />
          <Route path="/design/admin" element={<Lazy.AdminStyleComparePage />} />
          <Route path="/r/:token" element={<Lazy.PublicResumePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
