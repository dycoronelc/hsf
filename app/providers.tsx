'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: number
  email: string
  fullName: string | null
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  authHydrated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [authHydrated, setAuthHydrated] = useState(false)

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
    
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, authHydrated }}>
      {children}
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
