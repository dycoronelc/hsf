'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { apiErrorMessage } from '@/lib/apiErrorMessage'

export default function AdminOperationalSettingsPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [recallWaitSeconds, setRecallWaitSeconds] = useState(60)
  const [noShowWaitSeconds, setNoShowWaitSeconds] = useState(60)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/call-timings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('No se pudo cargar la configuración')
      const data = await response.json()
      setRecallWaitSeconds(Number(data.recallWaitSeconds) || 60)
      setNoShowWaitSeconds(Number(data.noShowWaitSeconds) || 60)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/call-timings', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recallWaitSeconds: Number(recallWaitSeconds),
          noShowWaitSeconds: Number(noShowWaitSeconds),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'No se pudo guardar'))
      }
      const data = await response.json()
      setRecallWaitSeconds(data.recallWaitSeconds)
      setNoShowWaitSeconds(data.noShowWaitSeconds)
      setMessage('Configuración guardada. La consola staff usará estos tiempos en los próximos llamados.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!authHydrated || !isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración operativa</h1>
            <p className="text-sm text-gray-600 mt-1">
              Tiempos de espera (en segundos) para habilitar acciones en la consola operativa.
            </p>
          </div>
          <Link href="/admin" className="text-hospital-blue hover:underline text-sm font-medium">
            ← Administración
          </Link>
        </div>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Cargando…</p>
        ) : (
          <form onSubmit={save} className="bg-white rounded-lg shadow p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segundos para mostrar «Volver a llamar»
              </label>
              <input
                type="number"
                min={0}
                max={3600}
                value={recallWaitSeconds}
                onChange={(e) => setRecallWaitSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Tras el primer llamado, el botón aparece cuando pase este tiempo (0 = inmediato).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segundos para mostrar «No se presentó»
              </label>
              <input
                type="number"
                min={0}
                max={3600}
                value={noShowWaitSeconds}
                onChange={(e) => setNoShowWaitSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Tras el segundo llamado, el botón aparece cuando pase este tiempo (0 = inmediato).
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-hospital-blue text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        )}
      </div>
    </SiteLayout>
  )
}
