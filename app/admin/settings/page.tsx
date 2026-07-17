'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { buildCallAnnouncement, DEFAULT_MONITOR_VOICE_TEMPLATE } from '@/lib/monitorVoice'

export default function AdminOperationalSettingsPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [recallWaitSeconds, setRecallWaitSeconds] = useState(60)
  const [noShowWaitSeconds, setNoShowWaitSeconds] = useState(60)
  const [voiceTemplate, setVoiceTemplate] = useState(DEFAULT_MONITOR_VOICE_TEMPLATE)
  const [loading, setLoading] = useState(true)
  const [savingTimings, setSavingTimings] = useState(false)
  const [savingVoice, setSavingVoice] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const preview = useMemo(
    () =>
      buildCallAnnouncement({
        ticketNumber: 'LR-8580',
        windowNumber: '2',
        serviceName: 'Radiología General',
        template: voiceTemplate,
      }),
    [voiceTemplate],
  )

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [timingsRes, voiceRes] = await Promise.all([
        fetch('/api/admin/call-timings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/monitor-voice-template', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      if (!timingsRes.ok) throw new Error('No se pudo cargar la configuración de tiempos')
      if (!voiceRes.ok) throw new Error('No se pudo cargar la plantilla de voz')
      const timings = await timingsRes.json()
      const voice = await voiceRes.json()
      setRecallWaitSeconds(Number(timings.recallWaitSeconds) || 60)
      setNoShowWaitSeconds(Number(timings.noShowWaitSeconds) || 60)
      setVoiceTemplate(
        typeof voice.template === 'string' && voice.template.trim()
          ? voice.template
          : DEFAULT_MONITOR_VOICE_TEMPLATE,
      )
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

  const saveTimings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSavingTimings(true)
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
      setMessage('Tiempos guardados. La consola staff los usará en los próximos llamados.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingTimings(false)
    }
  }

  const saveVoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSavingVoice(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/monitor-voice-template', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template: voiceTemplate }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'No se pudo guardar la plantilla'))
      }
      const data = await response.json()
      setVoiceTemplate(data.template)
      setMessage('Plantilla de voz guardada. El monitor la usará en el próximo refresco.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingVoice(false)
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
              Tiempos de la consola operativa y plantilla del anuncio de voz del monitor.
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
          <div className="space-y-6">
            <form onSubmit={saveTimings} className="bg-white rounded-lg shadow p-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Tiempos de espera</h2>
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
                disabled={savingTimings}
                className="px-4 py-2 bg-hospital-blue text-white rounded-lg disabled:opacity-50"
              >
                {savingTimings ? 'Guardando…' : 'Guardar tiempos'}
              </button>
            </form>

            <form onSubmit={saveVoice} className="bg-white rounded-lg shadow p-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Anuncio de voz del monitor</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla</label>
                <textarea
                  value={voiceTemplate}
                  onChange={(e) => setVoiceTemplate(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Variables disponibles:{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{turno}'}</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{ventanilla}'}</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{servicio}'}</code>. El turno se
                  convierte automáticamente a frase hablada (letras y dígitos).
                </p>
                <button
                  type="button"
                  onClick={() => setVoiceTemplate(DEFAULT_MONITOR_VOICE_TEMPLATE)}
                  className="mt-2 text-sm text-hospital-blue hover:underline"
                >
                  Restaurar plantilla por defecto
                </button>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Vista previa</p>
                <p className="text-sm text-slate-800">{preview}</p>
              </div>
              <button
                type="submit"
                disabled={savingVoice}
                className="px-4 py-2 bg-hospital-blue text-white rounded-lg disabled:opacity-50"
              >
                {savingVoice ? 'Guardando…' : 'Guardar plantilla de voz'}
              </button>
            </form>
          </div>
        )}
      </div>
    </SiteLayout>
  )
}
