import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { MianshiThemeId } from '../pages/design-showcase/mianshi-compare/themes'
import {
  applyThemeToDocument,
  getStoredTheme,
  THEME_STORAGE_KEY,
} from '../lib/designThemes'

type ThemeContextValue = {
  themeId: MianshiThemeId
  setThemeId: (id: MianshiThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<MianshiThemeId>(() => getStoredTheme())

  useEffect(() => {
    applyThemeToDocument(themeId)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId)
    } catch {
      /* ignore */
    }
  }, [themeId])

  const setThemeId = (id: MianshiThemeId) => setThemeIdState(id)

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
