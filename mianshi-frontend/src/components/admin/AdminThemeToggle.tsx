import { Moon, Sun } from 'lucide-react'
import { useAdminShell } from './AdminShellContext'

export function AdminThemeToggle() {
  const { colorMode, setColorMode } = useAdminShell()

  return (
    <button
      type="button"
      onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
      className="inline-flex size-8 items-center justify-center rounded-md text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text"
      title={colorMode === 'dark' ? '切换浅色' : '切换深色'}
      aria-label={colorMode === 'dark' ? '切换浅色主题' : '切换深色主题'}
    >
      {colorMode === 'dark' ? (
        <Sun className="size-4" strokeWidth={1.75} />
      ) : (
        <Moon className="size-4" strokeWidth={1.75} />
      )}
    </button>
  )
}
