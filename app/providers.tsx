'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { HelpProvider } from './components/help/HelpProvider'
import { SessionExpiredModal } from './components/SessionExpiredModal'
import { SessionExpiringModal } from './components/SessionExpiringModal'
import { DEFAULT_SESSION_EXPIRED_MESSAGE } from '@/lib/authToken'
import {
  getJwtExpMs,
  isJwtExpired,
  msUntilSessionWarning,
} from '@/lib/jwtUtils'

interface User {
  id: number
  email: string
  fullName: string | null
  role: string
  agentState?: string | null
  sessionNeverExpires?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  notifySessionExpired: (message?: string) => void
  isAuthenticated: boolean
  authHydrated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchCurrentUser(accessToken: string): Promise<User | null> {
  const userResponse = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!userResponse.ok) return null
  return userResponse.json()
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [authHydrated, setAuthHydrated] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(DEFAULT_SESSION_EXPIRED_MESSAGE)
  const [sessionExpiring, setSessionExpiring] = useState(false)
  const [sessionExtending, setSessionExtending] = useState(false)
  const warningTimerRef = useRef<number | null>(null)
  const expiryTimerRef = useRef<number | null>(null)

  const clearSessionTimers = useCallback(() => {
    if (warningTimerRef.current != null) {
      window.clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (expiryTimerRef.current != null) {
      window.clearTimeout(expiryTimerRef.current)
      expiryTimerRef.current = null
    }
  }, [])

  const clearStoredAuth = useCallback(() => {
    clearSessionTimers()
    setToken(null)
    setUser(null)
    setSessionExpiring(false)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }, [clearSessionTimers])

  const notifySessionExpired = useCallback(
    (message?: string) => {
      setSessionExpiredMessage(message?.trim() || DEFAULT_SESSION_EXPIRED_MESSAGE)
      setSessionExpired(true)
      setSessionExpiring(false)
      clearStoredAuth()
    },
    [clearStoredAuth],
  )

  const goToLoginAfterExpiry = useCallback(() => {
    setSessionExpired(false)
    router.replace('/login')
  }, [router])

  const scheduleSessionTimers = useCallback(
    (accessToken: string, neverExpires?: boolean) => {
      if (neverExpires) {
        clearSessionTimers()
        return
      }
      clearSessionTimers()
      const expMs = getJwtExpMs(accessToken)
      if (expMs == null) return

      const warnDelay = msUntilSessionWarning(accessToken)
      if (warnDelay != null) {
        warningTimerRef.current = window.setTimeout(() => {
          if (!isJwtExpired(accessToken)) {
            setSessionExpiring(true)
          }
        }, warnDelay)
      }

      const untilExpiry = expMs - Date.now()
      if (untilExpiry > 0) {
        expiryTimerRef.current = window.setTimeout(() => {
          notifySessionExpired('Su sesión ha expirado. Debe iniciar sesión de nuevo.')
        }, untilExpiry + 500)
      }
    },
    [clearSessionTimers, notifySessionExpired],
  )

  const applySession = useCallback(
    (accessToken: string, userData: User) => {
      setToken(accessToken)
      setUser(userData)
      setSessionExpired(false)
      setSessionExpiring(false)
      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(userData))
      scheduleSessionTimers(accessToken, userData.sessionNeverExpires)
    },
    [scheduleSessionTimers],
  )

  const refreshSession = useCallback(async () => {
    const currentToken = token ?? localStorage.getItem('token')
    if (!currentToken) {
      notifySessionExpired()
      return
    }
    setSessionExtending(true)
    try {
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      if (!response.ok) {
        notifySessionExpired()
        return
      }
      const data = await response.json()
      const userData = await fetchCurrentUser(data.access_token)
      if (!userData) {
        notifySessionExpired()
        return
      }
      applySession(data.access_token, userData)
    } catch {
      notifySessionExpired('No se pudo renovar la sesión. Debe iniciar sesión de nuevo.')
    } finally {
      setSessionExtending(false)
    }
  }, [token, notifySessionExpired, applySession])

  useEffect(() => {
    let cancelled = false

    async function hydrateAuth() {
      const storedToken = localStorage.getItem('token')
      if (!storedToken) {
        if (!cancelled) setAuthHydrated(true)
        return
      }

      if (isJwtExpired(storedToken)) {
        clearStoredAuth()
        if (!cancelled) {
          setSessionExpired(true)
          setSessionExpiredMessage('Su sesión ha expirado. Debe iniciar sesión de nuevo.')
          setAuthHydrated(true)
        }
        return
      }

      try {
        const userData = await fetchCurrentUser(storedToken)
        if (cancelled) return
        if (!userData) {
          clearStoredAuth()
          setSessionExpired(true)
          setSessionExpiredMessage(DEFAULT_SESSION_EXPIRED_MESSAGE)
        } else {
          applySession(storedToken, userData)
        }
      } catch {
        if (cancelled) return
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
          scheduleSessionTimers(storedToken)
        } else {
          clearStoredAuth()
        }
      } finally {
        if (!cancelled) setAuthHydrated(true)
      }
    }

    hydrateAuth()
    return () => {
      cancelled = true
    }
  }, [applySession, clearStoredAuth, scheduleSessionTimers])

  useEffect(() => () => clearSessionTimers(), [clearSessionTimers])

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Error al iniciar sesión' }))
      throw new Error(errorData.detail || 'Error al iniciar sesión')
    }

    const data = await response.json()
    const userData = await fetchCurrentUser(data.access_token)
    if (!userData) {
      throw new Error('No se pudo obtener el perfil del usuario')
    }
    applySession(data.access_token, userData)
  }

  const logout = () => {
    clearStoredAuth()
    setSessionExpired(false)
    setSessionExpiring(false)
  }

  const handleSessionLogout = () => {
    logout()
    router.replace('/login')
  }

  const minutesLeft = token
    ? Math.max(1, Math.ceil((getJwtExpMs(token)! - Date.now()) / 60000))
    : 5

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        notifySessionExpired,
        isAuthenticated: !!token,
        authHydrated,
      }}
    >
      <HelpProvider>{children}</HelpProvider>
      {sessionExpiring && !sessionExpired && (
        <SessionExpiringModal
          minutesLeft={minutesLeft}
          onExtend={() => void refreshSession()}
          onLogout={handleSessionLogout}
          extending={sessionExtending}
        />
      )}
      {sessionExpired && (
        <SessionExpiredModal message={sessionExpiredMessage} onLogin={goToLoginAfterExpiry} />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a Provider')
  }
  return context
}
