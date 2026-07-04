import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setAuthToken, type AuthUser, type BossBindOptions } from '../api/client'
import {
  clearGuestPracticeStorage,
  mergeGuestPracticeIntoUser,
} from '../lib/practiceStorage'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  authEnabled: boolean
  login: (email: string, password: string, boss?: BossBindOptions) => Promise<{ bossBound?: boolean; bossError?: string }>
  register: (email: string, password: string, name: string, boss?: BossBindOptions) => Promise<{ bossBound?: boolean; bossError?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authEnabled, setAuthEnabled] = useState(false)

  useEffect(() => {
    api
      .getAuthStatus()
      .then((res) => {
        setAuthEnabled(res.enabled)
        setUser(res.user)
      })
      .catch(() => setAuthEnabled(false))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string, boss?: BossBindOptions) => {
    const res = await api.login(email, password, boss)
    setAuthToken(res.token)
    mergeGuestPracticeIntoUser(res.user.id)
    setUser(res.user)
    return { bossBound: res.bossBound, bossError: res.bossError }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string, boss?: BossBindOptions) => {
    const res = await api.register(email, password, name, boss)
    setAuthToken(res.token)
    clearGuestPracticeStorage()
    setUser(res.user)
    return { bossBound: res.bossBound, bossError: res.bossError }
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, authEnabled, login, register, logout }),
    [user, loading, authEnabled, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
