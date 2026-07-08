'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../providers'
import { canAccessHost, isPatientRole } from '@/lib/authRoles'

export default function NewTicketPage() {
  const { isAuthenticated, user, authHydrated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (canAccessHost(user?.role)) {
      router.replace('/host/turnos')
      return
    }
    if (isPatientRole(user?.role)) {
      router.replace('/tickets')
    }
  }, [authHydrated, isAuthenticated, user, router])

  return (
    <div className="min-h-screen hospital-page-bg py-8">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Turnos en recepción</h1>
          <p className="text-gray-600 mb-6">
            Los turnos de Laboratorio y Radiología los genera el personal del hospital al momento de su
            llegada. No es necesario crearlos desde la plataforma.
          </p>
          <Link
            href="/tickets"
            className="inline-block px-6 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark"
          >
            Volver a Mis Turnos
          </Link>
        </div>
      </div>
    </div>
  )
}
