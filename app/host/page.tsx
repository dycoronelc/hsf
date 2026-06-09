'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../providers'
import { SiteLayout } from '../components/SiteLayout'
import { canAccessHost } from '@/lib/authRoles'
import { authHeaders, isAuthFailureStatus } from '@/lib/authToken'
import { apiErrorMessage } from '@/lib/apiErrorMessage'

const ARRIVAL_LABELS: Record<string, string> = {
  registrado: 'Registrado',
  espera_llegada: 'En espera de llegada',
  paciente_presente: 'Paciente presente',
  ticket_generado: 'Ticket generado',
}

export default function HostPage() {
  const { isAuthenticated, token, user, authHydrated } = useAuth()
  const router = useRouter()
  const [list, setList] = useState<
    Array<{
      id: number
      name1: string
      apellido1: string
      cedula: string
      departamento: string
      arrivalState: string
      fechapreadmision: string
      ticketId?: number | null
    }>
  >([])
  const [q, setQ] = useState('')
  const [arrivalState, setArrivalState] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (arrivalState) params.set('arrivalState', arrivalState)
      const res = await fetch(`/api/preadmission/work-list?${params.toString()}`, {
        headers: authHeaders(token),
      })
      if (isAuthFailureStatus(res.status)) {
        setMsg('Sesión expirada o sin permiso. Cierre sesión e ingrese de nuevo.')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setMsg(apiErrorMessage(body, 'No se pudo cargar la lista'))
        return
      }
      setList(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token, q, arrivalState])

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!user || !canAccessHost(user.role)) {
      router.replace('/dashboard')
      return
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [authHydrated, isAuthenticated, user, router, load])

  const confirm = async (id: number) => {
    setMsg('')
    const res = await fetch(`/api/preadmission/${id}/confirm-arrival`, {
      method: 'PATCH',
      headers: authHeaders(token),
    })
    if (res.ok) {
      setMsg('Llegada confirmada.')
      await load()
    } else {
      const body = await res.json().catch(() => ({}))
      setMsg(apiErrorMessage(body, 'No se pudo confirmar la llegada'))
    }
  }

  const activate = async (id: number) => {
    setMsg('')
    const res = await fetch(`/api/preadmission/${id}/activate-ticket`, {
      method: 'POST',
      headers: authHeaders(token),
    })
    if (res.ok) {
      const data = await res.json()
      setMsg(`Ticket generado: ${data.ticket_number ?? data.id}`)
      await load()
    } else {
      const body = await res.json().catch(() => ({}))
      setMsg(apiErrorMessage(body, 'No se pudo generar el ticket'))
    }
  }

  if (!authHydrated || !isAuthenticated || !user || !canAccessHost(user.role)) {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lista de llegadas</h1>
            <p className="text-gray-600 text-sm mt-1">
              Confirme la presencia del paciente y genere el ticket de admisión (según PDF de requisitos).
            </p>
          </div>
          <Link href="/dashboard" className="text-hospital-blue font-medium hover:underline text-sm">
            ← Dashboard
          </Link>
        </div>

        {msg && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-sm">
            {msg}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cédula o nombre"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="sm:w-56">
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado llegada</label>
            <select
              value={arrivalState}
              onChange={(e) => setArrivalState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todos</option>
              <option value="espera_llegada">En espera de llegada</option>
              <option value="paciente_presente">Paciente presente</option>
              <option value="ticket_generado">Ticket generado</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="px-4 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50"
          >
            {loading ? 'Cargando…' : 'Filtrar'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Paciente</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Cédula</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Área</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay registros con los filtros actuales.
                  </td>
                </tr>
              )}
              {list.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                  <td className="px-4 py-3">{row.id}</td>
                  <td className="px-4 py-3">
                    {row.name1} {row.apellido1}
                  </td>
                  <td className="px-4 py-3 font-mono">{row.cedula}</td>
                  <td className="px-4 py-3">{row.departamento}</td>
                  <td className="px-4 py-3">{ARRIVAL_LABELS[row.arrivalState] ?? row.arrivalState}</td>
                  <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                    {(row.arrivalState === 'espera_llegada' || row.arrivalState === 'registrado') && (
                      <button
                        type="button"
                        onClick={() => confirm(row.id)}
                        className="text-hospital-blue font-medium hover:underline"
                      >
                        Confirmar llegada
                      </button>
                    )}
                    {row.arrivalState === 'paciente_presente' && (
                      <button
                        type="button"
                        onClick={() => activate(row.id)}
                        className="text-green-700 font-medium hover:underline"
                      >
                        Generar ticket admisión
                      </button>
                    )}
                    {row.arrivalState === 'ticket_generado' && (
                      <span className="text-gray-500">Ticket #{row.ticketId ?? '—'}</span>
                    )}
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
