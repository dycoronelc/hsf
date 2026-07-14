'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { authHeaders } from '@/lib/authToken'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import {
  ARRIVAL_STATE_LABELS,
  DEPARTAMENTO_LABELS,
  formatPreadmissionDate,
  PREADMISSION_STATUS_LABELS,
} from '@/lib/preadmissionLabels'

type PreadmissionListItem = {
  id: number
  name1: string
  name2?: string | null
  apellido1: string
  apellido2?: string | null
  cedula: string
  email: string
  celular: string
  departamento: string
  status: string
  arrivalState: string
  fechapreadmision: string
  fechaprobableatencion?: string | null
  ticketId?: number | null
}

export default function AdminPreadmissionsPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<PreadmissionListItem[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [limit] = useState(50)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [status, setStatus] = useState('')
  const [arrivalState, setArrivalState] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({
    q: '',
    departamento: '',
    status: '',
    arrivalState: '',
  })

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
      if (appliedFilters.q.trim()) params.set('q', appliedFilters.q.trim())
      if (appliedFilters.departamento) params.set('departamento', appliedFilters.departamento)
      if (appliedFilters.status) params.set('status', appliedFilters.status)
      if (appliedFilters.arrivalState) params.set('arrivalState', appliedFilters.arrivalState)

      const response = await fetch(`/api/preadmission/manage?${params.toString()}`, {
        headers: authHeaders(token),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'No se pudieron cargar las preadmisiones'))
      }
      const data = await response.json()
      setItems(Array.isArray(data.items) ? data.items : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [token, skip, limit, appliedFilters])

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
  }, [authHydrated, isAuthenticated, user, router, load, appliedFilters, skip])

  const patientName = (row: PreadmissionListItem) =>
    [row.name1, row.name2, row.apellido1, row.apellido2].filter(Boolean).join(' ')

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.floor(skip / limit) + 1

  return (
    <SiteLayout>
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-hospital-blue hover:underline text-sm font-medium">
            ← Administración
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Preadmisiones</h1>
          <p className="text-gray-600 mt-2">
            Consulte y administre las preadmisiones digitales enviadas por los pacientes.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cédula, nombre o correo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
            <select
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg min-w-[140px]"
            >
              <option value="">Todas</option>
              <option value="RAD">Radiología</option>
              <option value="LAB">Laboratorio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado revisión</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg min-w-[160px]"
            >
              <option value="">Todos</option>
              {Object.entries(PREADMISSION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado llegada</label>
            <select
              value={arrivalState}
              onChange={(e) => setArrivalState(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg min-w-[180px]"
            >
              <option value="">Todos</option>
              {Object.entries(ARRIVAL_STATE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setAppliedFilters({ q, departamento, status, arrivalState })
              setSkip(0)
            }}
            className="px-4 py-2 bg-hospital-blue text-white rounded-lg font-medium hover:bg-hospital-blue-dark"
          >
            Buscar
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-600">Cargando preadmisiones…</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
              <table className="w-full min-w-[1280px] text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">ID</th>
                    <th className="text-left px-4 py-3 font-semibold min-w-[180px]">Paciente</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Cédula</th>
                    <th className="text-left px-4 py-3 font-semibold min-w-[200px]">Correo</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Área</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Fecha atención</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Revisión</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Llegada</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Enviado</th>
                    <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                        No hay preadmisiones con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-mono text-gray-700">#{row.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{patientName(row)}</td>
                        <td className="px-4 py-3">{row.cedula || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{row.email}</td>
                        <td className="px-4 py-3">
                          {DEPARTAMENTO_LABELS[row.departamento] ?? row.departamento}
                        </td>
                        <td className="px-4 py-3">{row.fechaprobableatencion || '—'}</td>
                        <td className="px-4 py-3">
                          {PREADMISSION_STATUS_LABELS[row.status] ?? row.status}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ARRIVAL_STATE_LABELS[row.arrivalState] ?? row.arrivalState}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatPreadmissionDate(row.fechapreadmision)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/preadmissions/${row.id}`}
                            className="text-hospital-blue hover:underline font-medium"
                          >
                            Ver / administrar
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {total > limit && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>
                  Mostrando {skip + 1}–{Math.min(skip + limit, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={skip === 0}
                    onClick={() => setSkip(Math.max(0, skip - limit))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="px-2 py-1.5">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={skip + limit >= total}
                    onClick={() => setSkip(skip + limit)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  )
}
