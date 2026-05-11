'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { formatDateToDdMmYyyy } from '@/lib/dateUtils'
import {
  buildCallAnnouncement,
  clearAnnouncementQueue,
  diffNewCalls,
  enqueueMonitorAnnouncement,
  snapshotCurrentTickets,
  unlockSpeechWithTestPhrase,
  warmupSpeechVoices,
} from '@/lib/monitorVoice'

const VOICE_STORAGE_KEY = 'hospital-sf-monitor-voice-enabled'

interface QueueItem {
  ticket_number: string
  service_name: string
  priority: string
  wait_time: number | null
  status: string
  window_number?: string | null
}

interface MonitorData {
  service_id: number
  service_name: string
  current: QueueItem | null
  queue: QueueItem[]
  next_numbers: string[]
}

interface PreadmissionItem {
  id: number
  cedula: string
  nombre: string
  status: string
  fechapreadmision: string
}

interface PreadmissionDept {
  departamento: string
  label: string
  items: PreadmissionItem[]
}

export default function MonitorPage() {
  const [queues, setQueues] = useState<MonitorData[]>([])
  const [preadmissions, setPreadmissions] = useState<PreadmissionDept[]>([])
  const [loading, setLoading] = useState(true)
  const [voiceArmed, setVoiceArmed] = useState(false)
  const [voicePreferenceSaved, setVoicePreferenceSaved] = useState(false)
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null)

  const prevSnapRef = useRef<Record<number, string | null>>({})
  const firstPollDoneRef = useRef(false)

  const fetchAll = async () => {
    try {
      const [queuesRes, preRes] = await Promise.all([
        fetch('/api/monitor/all-queues'),
        fetch('/api/monitor/preadmissions'),
      ])
      if (queuesRes.ok) {
        const data = await queuesRes.json()
        setQueues(data)
      }
      if (preRes.ok) {
        const data = await preRes.json()
        setPreadmissions(data)
      }
    } catch (error) {
      console.error('Error fetching monitor data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    try {
      if (localStorage.getItem(VOICE_STORAGE_KEY) === '1') setVoicePreferenceSaved(true)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    warmupSpeechVoices()
    const load = () => warmupSpeechVoices()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', load)
      return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
    }
    return undefined
  }, [])

  useEffect(() => {
    if (loading) return
    if (queues.length === 0) return

    const next = snapshotCurrentTickets(queues)

    if (!firstPollDoneRef.current) {
      prevSnapRef.current = next
      firstPollDoneRef.current = true
      return
    }

    if (!voiceArmed) {
      prevSnapRef.current = next
      return
    }

    const prev = prevSnapRef.current
    const changes = diffNewCalls(prev, next)

    for (const ch of changes) {
      const q = queues.find((x) => x.service_id === ch.service_id)
      const cur = q?.current
      if (!cur || cur.ticket_number !== ch.ticket_number) continue

      const text = buildCallAnnouncement({
        serviceName: q.service_name,
        ticketNumber: cur.ticket_number,
        windowNumber: cur.window_number,
      })
      setLastAnnouncement(text)
      enqueueMonitorAnnouncement(text)
    }

    prevSnapRef.current = next
  }, [queues, loading, voiceArmed])

  const enableVoiceClick = useCallback(() => {
    unlockSpeechWithTestPhrase()
    setVoiceArmed(true)
    setVoicePreferenceSaved(true)
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    prevSnapRef.current = snapshotCurrentTickets(queues)
  }, [queues])

  const disableVoiceClick = useCallback(() => {
    clearAnnouncementQueue()
    setVoiceArmed(false)
    try {
      localStorage.removeItem(VOICE_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setVoicePreferenceSaved(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            href="/"
            className="text-hospital-blue-light hover:text-white hover:underline text-sm font-medium inline-flex items-center gap-1"
          >
            ← Volver al inicio
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {!voiceArmed ? (
              <button
                type="button"
                onClick={enableVoiceClick}
                className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm sm:text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                Activar llamados por voz (TV)
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/50 border border-emerald-600/50 text-emerald-200 text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
                  Voz activa
                </span>
                <button
                  type="button"
                  onClick={disableVoiceClick}
                  className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200"
                >
                  Silenciar
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mb-6 max-w-2xl mx-auto">
          En el navegador de la TV pulse <strong>Activar llamados por voz</strong> una vez por sesión
          (los navegadores exigen un clic para reproducir audio). Cada vez que recepción llame un turno,
          se anunciará el número y la ventanilla en español (Panamá).
          {voicePreferenceSaved && !voiceArmed && (
            <span className="block mt-2 text-amber-200/90">
              Tenía la voz activada antes: pulse de nuevo para reactivarla en esta pantalla.
            </span>
          )}
        </p>

        {lastAnnouncement && (
          <div
            className="mb-6 p-4 rounded-lg bg-gray-800/80 border border-gray-600 text-center text-gray-200 text-sm sm:text-base"
            aria-live="polite"
          >
            <span className="text-gray-500 block text-xs mb-1">Último anuncio</span>
            {lastAnnouncement}
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">Pantalla de Llamados</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {queues.map((queue) => (
            <div key={queue.service_id} className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-4 text-hospital-blue-light">{queue.service_name}</h2>

              {queue.current && (
                <div className="bg-hospital-blue rounded-lg p-4 mb-4 animate-pulse">
                  <div className="text-sm text-gray-300 mb-1">Llamando ahora:</div>
                  <div className="text-4xl font-bold">{queue.current.ticket_number}</div>
                  {queue.current.window_number && (
                    <div className="text-xl font-semibold mt-2 text-white">
                      Ventanilla {queue.current.window_number}
                    </div>
                  )}
                  {queue.current.wait_time !== null && (
                    <div className="text-sm text-gray-300 mt-2">
                      Tiempo de espera: {queue.current.wait_time} min
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm text-gray-400 mb-2">En cola:</div>
                {queue.queue.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">No hay pacientes en cola</div>
                ) : (
                  queue.queue.slice(0, 10).map((item, index) => (
                    <div
                      key={item.ticket_number}
                      className={`flex justify-between items-center p-3 rounded ${
                        index === 0 ? 'bg-gray-700 border-2 border-hospital-blue' : 'bg-gray-700/50'
                      }`}
                    >
                      <span className="text-xl font-semibold">{item.ticket_number}</span>
                      {item.wait_time !== null && (
                        <span className="text-sm text-gray-400">{item.wait_time} min</span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {queue.next_numbers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Próximos:</div>
                  <div className="flex flex-wrap gap-2">
                    {queue.next_numbers.map((num) => (
                      <span key={num} className="text-sm bg-gray-700 px-2 py-1 rounded">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {preadmissions.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-4 text-hospital-blue-light">Preadmisiones solicitadas</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {preadmissions.map((dept) => (
                <div key={dept.departamento} className="bg-gray-800 rounded-lg p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4 text-hospital-blue-light">{dept.label}</h3>
                  <div className="space-y-2">
                    {dept.items.length === 0 ? (
                      <div className="text-gray-500 text-center py-4">Sin preadmissiones pendientes</div>
                    ) : (
                      dept.items.slice(0, 10).map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-3 rounded bg-gray-700/50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{item.nombre}</div>
                            <div className="text-xs text-gray-400">
                              {item.cedula} · {formatDateToDdMmYyyy(item.fechapreadmision)}
                            </div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300 shrink-0 ml-2">
                            {item.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-gray-500 text-sm">
          Última actualización de datos: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
