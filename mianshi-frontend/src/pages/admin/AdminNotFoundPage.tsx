import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { AdminButtonLink } from '../../components/admin/AdminButton'

export function AdminNotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold tabular-nums text-admin-muted">404</p>
      <h1 className="mt-2 text-lg font-semibold text-admin-text">页面不存在</h1>
      <p className="mt-1 max-w-sm text-sm text-admin-muted">
        该后台路径未注册，请从侧栏选择功能或返回数据看板。
      </p>
      <div className="mt-6 flex gap-2">
        <AdminButtonLink to="/admin" size="sm">
          返回看板
        </AdminButtonLink>
        <AdminButtonLink to="/admin/manage" variant="secondary" size="sm">
          <FileQuestion className="size-3.5" />
          题库管理
        </AdminButtonLink>
      </div>
      <Link to="/" className="mt-4 text-xs text-admin-muted hover:text-admin-text">
        返回用户端
      </Link>
    </div>
  )
}
