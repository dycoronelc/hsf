'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { authHeaders, handleAuthFailure } from '@/lib/authToken'
import { CALL_DESTINATIONS } from '@/lib/callDestinations'

type OccupiedItem = {
  destination: string
  ticket_id: number
  ticket_number: string
  status: string
}

function statusLabel(status: string): string {
  if (status === 'llamado') return 'Llamado'
  if (status === 'en_atencion') return 'En atención'
  return status
}

export default function AdminReleaseDestinationsPage() {
  const { isAuthenticated, user, token, authHydrated, notifySessionExpired } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<OccupiedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [releaseLoading, setReleaseLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/tickets/occupied-destinations', {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (!response.ok) {
        throw new Error('No se pudo cargar el estado de los destinos')
      }
      const data = await response.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [token, notifySessionExpired])

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
    void load()
  }, [authHydrated, isAuthenticated, user, router, load])

  const handleRelease = async (dest: string) => {
    if (!token) return
    const ok = window.confirm(
      `¿Liberar «${dest}»? El turno en curso volverá a la cola de espera.`,
    )
    if (!ok) return
    setReleaseLoading(dest)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/tickets/release-destination', {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ windowNumber: dest }),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(apiErrorMessage(data, 'No se pudo liberar el destino'))
        return
      }
      const released = Number(data.released) || 0
      const tickets = Array.isArray(data.tickets) ? data.tickets.join(', ') : ''
      setMessage(
        released > 0
          ? `Se liberó «${dest}». Turno(s) devuelto(s) a cola: ${tickets}`
          : `«${dest}» ya estaba libre.`,
      )
      await load()
    } catch {
      setError('Error al liberar el destino')
    } finally {
      setReleaseLoading(null)
    }
  }

  if (!authHydrated || !isAuthenticated || user?.role !== 'admin') {
    return null
  }

  const byDest = new Map<string, OccupiedItem[]>()
  for (const item of items) {
    const list = byDest.get(item.destination) ?? []
    list.push(item)
    byDest.set(item.destination, list)
  }

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-[#00816D] hover:underline">
            ← Volver a Administración
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Liberar destinos</h1>
          <p className="text-gray-600 mt-2">
            Libere ventanillas u otros destinos bloqueados por un turno en llamado o en atención
            (por ejemplo, tras una sesión expirada). El turno vuelve a la cola de espera.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Destinos del llamado</h2>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || releaseLoading != null}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          {loading && items.length === 0 ? (
            <p className="text-gray-500 text-sm">Cargando destinos…</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {CALL_DESTINATIONS.map((dest) => {
                const occupied = byDest.get(dest) ?? []
                const isOccupied = occupied.length > 0
                return (
                  <li
                    key={dest}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{dest}</p>
                      {isOccupied ? (
                        <p className="text-sm text-amber-800 mt-0.5">
                          Ocupado
                          {occupied.map((o) => (
                            <span key={o.ticket_id}>
                              {' '}
                              · {o.ticket_number} ({statusLabel(o.status)})
                            </span>
                          ))}
                        </p>
                      ) : (
                        <p className="text-sm text-green-700 mt-0.5">Libre</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRelease(dest)}
                      disabled={!isOccupied || releaseLoading === dest || loading}
                      className="px-4 py-2 text-sm bg-[#00816D] text-white rounded-lg hover:bg-[#006b5a] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {releaseLoading === dest ? 'Liberando…' : 'Liberar destino'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </SiteLayout>
  )
}
