'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HelpProvider } from './components/help/HelpProvider'
import { SessionExpiredModal } from './components/SessionExpiredModal'
import { DEFAULT_SESSION_EXPIRED_MESSAGE } from '@/lib/authToken'

interface User {
  id: number
  email: string
  fullName: string | null
  role: string
  agentState?: string | null
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

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [authHydrated, setAuthHydrated] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(DEFAULT_SESSION_EXPIRED_MESSAGE)

  const clearStoredAuth = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }, [])

  const notifySessionExpired = useCallback(
    (message?: string) => {
      setSessionExpiredMessage(message?.trim() || DEFAULT_SESSION_EXPIRED_MESSAGE)
      setSessionExpired(true)
      clearStoredAuth()
    },
    [clearStoredAuth],
  )

  const goToLoginAfterExpiry = useCallback(() => {
    setSessionExpired(false)
    router.replace('/login')
  }, [router])

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setAuthHydrated(true)
  }, [])

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
    setToken(data.access_token)
    
    const userResponse = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    const userData = await userResponse.json()
    setUser(userData)
    setSessionExpired(false)

    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    clearStoredAuth()
    setSessionExpired(false)
  }

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
