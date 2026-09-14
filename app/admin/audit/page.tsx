'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { canAccessAudit } from '@/lib/authRoles'
import { authHeaders, handleAuthFailure } from '@/lib/authToken'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { formatDateToDdMmYyyy, ddMmYyyyToIso, isValidDdMmYyyy } from '@/lib/dateUtils'

type AuditItem = {
  id: number
  action: string
  entityType: string | null
  entityId: number | null
  userId: number | null
  userEmail: string | null
  userName: string | null
  details: string | null
  ipAddress: string | null
  module: string | null
  createdAt: string
}

export default function AdminAuditPage() {
  const { isAuthenticated, user, token, authHydrated, notifySessionExpired } = useAuth()
  const router = useRouter()
  const [fromDd, setFromDd] = useState(() => formatDateToDdMmYyyy(new Date(Date.now() - 7 * 86400000)))
  const [toDd, setToDd] = useState(() => formatDateToDdMmYyyy(new Date()))
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [module, setModule] = useState('')
  const [items, setItems] = useState<AuditItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    if (isValidDdMmYyyy(fromDd)) params.set('from', ddMmYyyyToIso(fromDd))
    if (isValidDdMmYyyy(toDd)) params.set('to', ddMmYyyyToIso(toDd))
    if (userId.trim()) params.set('userId', userId.trim())
    if (action.trim()) params.set('action', action.trim())
    if (module.trim()) params.set('module', module.trim())
    params.set('limit', '200')
    return params
  }, [fromDd, toDd, userId, action, module])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/audit?${buildParams().toString()}`, {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(res.status, notifySessionExpired)) return
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(body, 'No se pudo cargar la bitácora'))
      }
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [token, buildParams, notifySessionExpired])

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!user || !canAccessAudit(user)) {
      router.replace('/dashboard')
      return
    }
    load()
  }, [authHydrated, isAuthenticated, user, router, load])

  const exportExcel = async () => {
    if (!token) return
    setExporting(true)
    setError('')
    try {
      const res = await fetch(`/api/audit/export?${buildParams().toString()}`, {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(res.status, notifySessionExpired)) return
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(body, 'No se pudo exportar'))
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bitacora_${ddMmYyyyToIso(fromDd) || 'desde'}_${ddMmYyyyToIso(toDd) || 'hasta'}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  if (!authHydrated || !isAuthenticated || !user || !canAccessAudit(user)) {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link href="/admin" className="text-hospital-blue hover:underline font-medium">
            ← Administración
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bitácora de auditoría</h1>
          <p className="text-gray-600 mt-2">
            Registro de acciones del sistema (quién, cuándo, dónde, qué). Filtre por fecha o usuario y
            exporte a Excel.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde (dd/mm/yyyy)</label>
            <input
              type="text"
              value={fromDd}
              onChange={(e) => setFromDd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta (dd/mm/yyyy)</label>
            <input
              type="text"
              value={toDd}
              onChange={(e) => setToDd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID usuario</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="login, ticket_…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Módulo</label>
            <input
              type="text"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="auth, staff…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="px-4 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50"
            >
              {loading ? 'Cargando…' : 'Filtrar'}
            </button>
            <button
              type="button"
              onClick={() => void exportExcel()}
              disabled={exporting}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {exporting ? 'Exportando…' : 'Excel'}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          {total} registro{total === 1 ? '' : 's'} (mostrando {items.length})
        </p>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Fecha/hora</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Usuario</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">IP</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Módulo</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Acción</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Entidad</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No hay registros con los filtros actuales.
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{row.createdAt}</td>
                  <td className="px-3 py-2">
                    <div>{row.userName || '—'}</div>
                    <div className="text-xs text-gray-500">
                      {row.userEmail || (row.userId != null ? `ID ${row.userId}` : '')}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.ipAddress || '—'}</td>
                  <td className="px-3 py-2">{row.module || '—'}</td>
                  <td className="px-3 py-2 font-medium">{row.action}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.entityType || '—'}
                    {row.entityId != null ? ` #${row.entityId}` : ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 max-w-xs break-words">
                    {row.details || '—'}
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
