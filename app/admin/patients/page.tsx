'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { formatDateToDdMmYyyy } from '@/lib/dateUtils'

interface PatientRow {
  id: number
  email: string
  fullName: string | null
  nationalId: string | null
  phone: string | null
  birthDate: string | null
  isActive: boolean
  createdAt: string
}

export default function AdminPatientsPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [q, setQ] = useState('')
  const [appliedQ, setAppliedQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (appliedQ.trim()) params.set('q', appliedQ.trim())
      const response = await fetch(`/api/admin/patients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('No se pudieron cargar los pacientes')
      setPatients(await response.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [token, appliedQ])

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

  if (!authHydrated || !isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pacientes registrados</h1>
            <p className="text-sm text-gray-600 mt-1">Consulta de cuentas de pacientes en la plataforma.</p>
          </div>
          <Link href="/admin" className="text-hospital-blue hover:underline text-sm font-medium">
            ← Administración
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setAppliedQ(q)}
            placeholder="Buscar por correo, nombre, cédula o celular"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <button
            type="button"
            onClick={() => setAppliedQ(q)}
            className="px-4 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark"
          >
            Buscar
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">ID</th>
                <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold">Correo</th>
                <th className="text-left px-4 py-3 font-semibold">Cédula</th>
                <th className="text-left px-4 py-3 font-semibold">Celular</th>
                <th className="text-left px-4 py-3 font-semibold">Registro</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loading && patients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No hay pacientes con los filtros actuales.
                  </td>
                </tr>
              )}
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{p.id}</td>
                  <td className="px-4 py-3">{p.fullName || '—'}</td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3 font-mono">{p.nationalId || '—'}</td>
                  <td className="px-4 py-3">{p.phone || '—'}</td>
                  <td className="px-4 py-3">{formatDateToDdMmYyyy(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SiteLayout>
  )
}
