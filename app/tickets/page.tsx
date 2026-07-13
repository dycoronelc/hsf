'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { isPatientRole } from '@/lib/authRoles'

export default function TicketsRedirectPage() {
  const { isAuthenticated, user, authHydrated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (isPatientRole(user?.role)) {
      router.replace('/dashboard')
    }
  }, [authHydrated, isAuthenticated, user, router])

  return (
    <div className="min-h-screen hospital-page-bg flex items-center justify-center">
      <p className="text-gray-600">Redirigiendo…</p>
    </div>
  )
}
