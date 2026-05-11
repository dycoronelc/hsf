'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { roleLabel } from '@/lib/roleLabels'

interface StaffUser {
  id: number
  email: string
  fullName: string | null
  role: string
  isActive: boolean
}

const ASSIGNABLE_ROLES = [
  'anfitrion',
  'oficial_admision',
  'reception',
  'supervisor',
  'laboratorio',
  'radiologia',
  'auditor',
  'technician',
  'admin',
]

export default function AdminUsersPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('No se pudieron cargar los usuarios')
      setUsers(await response.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    load()
  }, [authHydrated, isAuthenticated, user, router, load])

  const updateUser = async (id: number, patch: { role?: string; isActive?: boolean }) => {
    if (!token) return
    setSavingId(id)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo actualizar el usuario')
      }
      setMessage('Usuario actualizado.')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  if (!authHydrated || !isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-hospital-blue hover:underline text-sm">
            ← Administración
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Usuarios del sistema</h1>
          <p className="text-gray-600 mt-1">
            Asigne roles operativos y controle el acceso del personal hospitalario.
          </p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
        {message && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>}

        <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
          {loading ? (
            <p className="text-gray-600">Cargando usuarios...</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Correo</th>
                  <th className="py-2 pr-3">Rol</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((staff) => (
                  <tr key={staff.id} className="border-b border-gray-100">
                    <td className="py-3 pr-3">{staff.fullName || '—'}</td>
                    <td className="py-3 pr-3">{staff.email}</td>
                    <td className="py-3 pr-3">
                      <select
                        value={staff.role}
                        disabled={savingId === staff.id}
                        onChange={(e) => updateUser(staff.id, { role: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={staff.isActive ? 'text-green-700' : 'text-gray-500'}>
                        {staff.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        disabled={savingId === staff.id}
                        onClick={() => updateUser(staff.id, { isActive: !staff.isActive })}
                        className="text-hospital-blue hover:underline disabled:opacity-50"
                      >
                        {staff.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SiteLayout>
  )
}
