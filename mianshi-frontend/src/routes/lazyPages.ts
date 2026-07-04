import { lazy, type ComponentType } from 'react'

/** Named export → React.lazy default */
function lazyNamed<M extends Record<string, ComponentType<unknown>>, K extends keyof M>(
  loader: () => Promise<M>,
  exportName: K,
) {
  return lazy(() => loader().then((m) => ({ default: m[exportName] as ComponentType<unknown> })))
}

// Core app (loaded on demand after home)
export const QuickInterviewPage = lazyNamed(
  () => import('../pages/QuickInterviewPage'),
  'QuickInterviewPage',
)
export const InterviewPage = lazyNamed(() => import('../pages/InterviewPage'), 'InterviewPage')
export const ReportsPage = lazyNamed(() => import('../pages/ReportsPage'), 'ReportsPage')
export const ReportDetailPage = lazyNamed(
  () => import('../pages/ReportDetailPage'),
  'ReportDetailPage',
)
export const QuestionBankHubPage = lazyNamed(
  () => import('../pages/QuestionBankHubPage'),
  'QuestionBankHubPage',
)
export const QuestionBankPage = lazyNamed(
  () => import('../pages/QuestionBankPage'),
  'QuestionBankPage',
)
export const PathsPage = lazyNamed(() => import('../pages/PathsPage'), 'PathsPage')
export const ExperiencesPage = lazyNamed(
  () => import('../pages/ExperiencesPage'),
  'ExperiencesPage',
)
export const ExperienceDetailPage = lazyNamed(
  () => import('../pages/ExperienceDetailPage'),
  'ExperienceDetailPage',
)
export const InvitePage = lazyNamed(() => import('../pages/InvitePage'), 'InvitePage')
export const LoginPage = lazyNamed(() => import('../pages/LoginPage'), 'LoginPage')
export const RegisterPage = lazyNamed(() => import('../pages/RegisterPage'), 'RegisterPage')
export const ProfilePage = lazyNamed(() => import('../pages/ProfilePage'), 'ProfilePage')
export const JobsPage = lazyNamed(() => import('../pages/JobsPage'), 'JobsPage')
export const BossMessagesPage = lazyNamed(
  () => import('../pages/BossMessagesPage'),
  'BossMessagesPage',
)
export const JobDetailPage = lazyNamed(() => import('../pages/JobDetailPage'), 'JobDetailPage')
export const PublicResumePage = lazyNamed(
  () => import('../pages/PublicResumePage'),
  'PublicResumePage',
)

// Resume module
export const ResumeLayout = lazyNamed(() => import('../pages/ResumePage'), 'ResumeLayout')
export const ResumeIndexRedirect = lazyNamed(
  () => import('../pages/ResumePage'),
  'ResumeIndexRedirect',
)
export const GenerateView = lazyNamed(
  () => import('../pages/resume/views/GenerateView'),
  'GenerateView',
)
export const OptimizeView = lazyNamed(
  () => import('../pages/resume/views/OptimizeView'),
  'OptimizeView',
)
export const EditView = lazyNamed(() => import('../pages/resume/views/EditView'), 'EditView')
export const ResumeMineView = lazyNamed(
  () => import('../pages/resume/views/ResumeMineView'),
  'ResumeMineView',
)
export const TemplatesView = lazyNamed(
  () => import('../pages/resume/views/TemplatesView'),
  'TemplatesView',
)
export const HelpView = lazyNamed(() => import('../pages/resume/views/HelpView'), 'HelpView')

// Admin
export const AdminLayout = lazyNamed(() => import('../pages/admin/AdminLayout'), 'AdminLayout')
export const AdminDashboardPage = lazyNamed(
  () => import('../pages/admin/AdminDashboardPage'),
  'AdminDashboardPage',
)
export const AdminQuestionsPage = lazyNamed(
  () => import('../pages/admin/AdminQuestionsPage'),
  'AdminQuestionsPage',
)
export const AdminImportPage = lazyNamed(
  () => import('../pages/admin/AdminImportPage'),
  'AdminImportPage',
)
export const AdminQuestionManagePage = lazyNamed(
  () => import('../pages/admin/AdminQuestionManagePage'),
  'AdminQuestionManagePage',
)
export const AdminQuestionEditPage = lazyNamed(
  () => import('../pages/admin/AdminQuestionEditPage'),
  'AdminQuestionEditPage',
)
export const AdminCandidatesPage = lazyNamed(
  () => import('../pages/admin/AdminCandidatesPage'),
  'AdminCandidatesPage',
)
export const AdminExperiencesPage = lazyNamed(
  () => import('../pages/admin/AdminExperiencesPage'),
  'AdminExperiencesPage',
)
export const AdminReportsPage = lazyNamed(
  () => import('../pages/admin/AdminReportsPage'),
  'AdminReportsPage',
)
export const AdminUsersPage = lazyNamed(
  () => import('../pages/admin/AdminUsersPage'),
  'AdminUsersPage',
)
export const AdminUserDetailPage = lazyNamed(
  () => import('../pages/admin/AdminUserDetailPage'),
  'AdminUserDetailPage',
)
export const AdminResumeSharesPage = lazyNamed(
  () => import('../pages/admin/AdminResumeSharesPage'),
  'AdminResumeSharesPage',
)
export const AdminSystemPage = lazyNamed(
  () => import('../pages/admin/AdminSystemPage'),
  'AdminSystemPage',
)
export const AdminJobsPage = lazyNamed(
  () => import('../pages/admin/AdminJobsPage'),
  'AdminJobsPage',
)
export const AdminSettingsPage = lazyNamed(
  () => import('../pages/admin/AdminSettingsPage'),
  'AdminSettingsPage',
)
export const AdminNotFoundPage = lazyNamed(
  () => import('../pages/admin/AdminNotFoundPage'),
  'AdminNotFoundPage',
)

// Design showcase (dev / demo)
export const DesignShowcaseHub = lazy(() => import('../pages/design-showcase/index'))
export const MinimalMicroInteractions = lazy(
  () => import('../pages/design-showcase/MinimalMicroInteractions'),
)
export const GlassmorphismPage = lazy(() => import('../pages/design-showcase/GlassmorphismPage'))
export const NeumorphismPage = lazy(() => import('../pages/design-showcase/NeumorphismPage'))
export const BrutalismPage = lazy(() => import('../pages/design-showcase/BrutalismPage'))
export const AiNativePage = lazy(() => import('../pages/design-showcase/AiNativePage'))
export const MianshiStyleComparePage = lazy(
  () => import('../pages/design-showcase/mianshi-compare'),
)
export const AdminStyleComparePage = lazy(
  () => import('../pages/design-showcase/admin-compare'),
)
