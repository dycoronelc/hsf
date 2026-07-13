'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

function callPanelClass(priority?: string): string {
  if (priority === 'emergencia') return 'bg-red-600'
  if (priority === 'cita' || priority === 'adulto_mayor') return 'bg-amber-500'
  return 'bg-emerald-600'
}

export default function MonitorPage() {
  const [queues, setQueues] = useState<MonitorData[]>([])
  const [loading, setLoading] = useState(true)
  const [voiceArmed, setVoiceArmed] = useState(false)
  const [voicePreferenceSaved, setVoicePreferenceSaved] = useState(false)
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null)

  const prevSnapRef = useRef<Record<number, string | null>>({})
  const firstPollDoneRef = useRef(false)

  const fetchAll = async () => {
    try {
      const queuesRes = await fetch('/api/monitor/all-queues')
      if (queuesRes.ok) {
        setQueues(await queuesRes.json())
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

  const primaryCall = queues.find((q) => q.current)?.current ?? null
  const primaryService = queues.find((q) => q.current)?.service_name ?? ''

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-gray-700 pb-6">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-hospital-santa-fe.png"
              alt="Hospital Santa Fe"
              width={200}
              height={56}
              className="h-12 w-auto object-contain"
              unoptimized
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Pantalla de Llamados</h1>
              <p className="text-gray-400 text-sm">Hospital Santa Fe Panamá</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!voiceArmed ? (
              <button
                type="button"
                onClick={enableVoiceClick}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm"
              >
                Activar voz
              </button>
            ) : (
              <button
                type="button"
                onClick={disableVoiceClick}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm"
              >
                Silenciar
              </button>
            )}
            <Link href="/" className="text-sm text-gray-400 hover:text-white">
              Inicio
            </Link>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl bg-gray-800 border border-gray-700 p-6 min-h-[220px] flex flex-col justify-center">
            <p className="text-sm uppercase tracking-wide text-gray-400 mb-2">Información</p>
            <p className="text-lg text-gray-200 leading-relaxed">
              Por favor permanezca en la sala de espera. Será llamado por su número de turno en la
              ventanilla indicada.
            </p>
            {lastAnnouncement && (
              <p className="mt-4 text-sm text-emerald-300" aria-live="polite">
                {lastAnnouncement}
              </p>
            )}
            <p className="mt-4 text-xs text-gray-500">
              Espacio reservado para mensajes institucionales o contenido multimedia.
            </p>
          </div>

          <div
            className={`rounded-xl p-8 min-h-[220px] flex flex-col items-center justify-center text-center shadow-lg ${
              primaryCall ? callPanelClass(primaryCall.priority) : 'bg-gray-800 border border-gray-700'
            }`}
          >
            <p className="text-sm uppercase tracking-wide text-white/80 mb-2">Turno en llamado</p>
            {primaryCall ? (
              <>
                <p className="text-5xl sm:text-6xl font-bold">{primaryCall.ticket_number}</p>
                <p className="text-xl mt-3 font-medium">{primaryService}</p>
                {primaryCall.window_number && (
                  <p className="text-2xl mt-4 font-semibold">Ventanilla {primaryCall.window_number}</p>
                )}
              </>
            ) : (
              <p className="text-2xl text-gray-400">En espera de llamado</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {queues.map((queue) => (
            <div key={queue.service_id} className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-emerald-300">{queue.service_name}</h2>

              {queue.current && (
                <div className={`${callPanelClass(queue.current.priority)} rounded-lg p-4 mb-4`}>
                  <div className="text-sm text-white/80 mb-1">Llamando:</div>
                  <div className="text-3xl font-bold">{queue.current.ticket_number}</div>
                  {queue.current.window_number && (
                    <div className="text-lg font-semibold mt-2">Ventanilla {queue.current.window_number}</div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm text-gray-400 mb-2">En cola</div>
                {queue.queue.length === 0 ? (
                  <div className="text-gray-500 text-center py-4 text-sm">Sin pacientes en cola</div>
                ) : (
                  queue.queue.slice(0, 8).map((item) => (
                    <div key={item.ticket_number} className="flex justify-between items-center p-2 rounded bg-gray-700/60">
                      <span className="text-lg font-semibold">{item.ticket_number}</span>
                      {item.wait_time != null && (
                        <span className="text-xs text-gray-400">{item.wait_time} min</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          Actualizado: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
