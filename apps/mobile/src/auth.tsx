import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import { getSession, hydrateSession, setSession, subscribeSession } from './session'
import type { Session } from './types'

type AuthValue = {
  ready: boolean
  session: Session | null
  login: (session: Session) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setLocal] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => subscribeSession(() => setLocal(getSession())), [])

  useEffect(() => {
    hydrateSession()
      .then(async () => {
        setLocal(getSession())
        if (!getSession()) return
        try {
          await api('/api/me')
        } catch {
          await setSession(null)
          setLocal(null)
        }
      })
      .finally(() => setReady(true))
  }, [])

  const value: AuthValue = {
    ready,
    session,
    async login(next) {
      await setSession(next)
      setLocal(next)
    },
    async logout() {
      const current = getSession()
      try {
        if (current) await api('/api/auth/logout', { body: { refreshToken: current.refreshToken }, auth: false })
      } catch {
        // La sesión local se borra igual.
      }
      await setSession(null)
      setLocal(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('Falta el proveedor de sesión')
  return value
}
