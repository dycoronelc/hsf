'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { HospitalLogo } from './HospitalLogo'
import { HelpLauncher } from './help/HelpLauncher'
import { isPatientRole, canAccessHost, canAccessStaffConsole, canAccessReports } from '@/lib/authRoles'

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [userMenuOpen])

  const handleLogout = () => {
    setUserMenuOpen(false)
    logout()
    router.replace('/login')
  }

  const homeHref = isAuthenticated ? '/dashboard' : '/login'

  return (
    <div className="min-h-screen hospital-page-bg flex flex-col">
      <header className="shadow-sm shrink-0" style={{ backgroundColor: '#00816D' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href={homeHref} className="block">
                <HospitalLogo />
              </Link>
            </div>
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="text-white/90 hover:text-white font-medium">
                    Inicio
                  </Link>
                  {isPatientRole(user?.role) && (
                    <Link href="/preadmission" className="text-white/90 hover:text-white font-medium">
                      Preadmisión
                    </Link>
                  )}
                  {canAccessHost(user?.role) && (
                    <Link href="/host" className="text-white/90 hover:text-white font-medium">
                      Llegadas (Anfitrión)
                    </Link>
                  )}
                  {canAccessStaffConsole(user?.role) && (
                    <Link href="/staff" className="text-white/90 hover:text-white font-medium">
                      Consola Staff
                    </Link>
                  )}
                  {user?.role === 'admin' && (
                    <Link href="/admin" className="text-white/90 hover:text-white font-medium">
                      Administración
                    </Link>
                  )}
                  {canAccessReports(user?.role) && (
                    <Link href="/reports" className="text-white/90 hover:text-white font-medium">
                      Reportes
                    </Link>
                  )}
                  <HelpLauncher variant="header" />
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                      aria-label="Menú de usuario"
                      aria-expanded={userMenuOpen}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 py-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName || 'Usuario'}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        <Link
                          href="/help"
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          Manual y FAQ
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Cerrar sesión
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <HelpLauncher variant="header" />
                  <Link href="/login" className="text-white/90 hover:text-white font-medium">
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/register"
                    className="bg-white text-[#00816D] px-4 py-2 rounded-lg font-medium hover:bg-white/90"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2024 Hospital Santa Fe Panamá. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
