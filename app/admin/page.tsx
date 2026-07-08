'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../components/SiteLayout'
import { useAuth } from '../providers'

const adminCards = [
  {
    href: '/admin/preadmissions',
    title: 'Preadmisiones',
    description: 'Consulte y administre las preadmisiones digitales de pacientes.',
  },
  {
    href: '/admin/permissions',
    title: 'Permisos por rol',
    description: 'Configure qué acciones puede realizar cada rol operativo.',
  },
  {
    href: '/admin/ticket-types',
    title: 'Tipos de ticket',
    description: 'Cree, active o desactive nomenclaturas y prioridades de atención.',
  },
  {
    href: '/admin/users',
    title: 'Usuarios del sistema',
    description: 'Asigne roles y active o desactive cuentas de personal.',
  },
]

export default function AdminHomePage() {
  const { isAuthenticated, user, authHydrated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [authHydrated, isAuthenticated, user, router])

  if (!authHydrated || !isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Administración</h1>
          <p className="text-gray-600 mt-2">
            Configuración de permisos, tipos de ticket, usuarios y preadmisiones del Hospital Santa Fe.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {adminCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h2>
              <p className="text-gray-600">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  )
}
