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

interface MonitorMediaItem {
  id: number
  kind: 'message' | 'image' | 'video'
  title: string
  body: string | null
}

function isTriageService(name: string): boolean {
  return /triage/i.test(name)
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '')
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1` : null
    }
  } catch {
    /* ignore */
  }
  return null
}

export default function MonitorPage() {
  const [queues, setQueues] = useState<MonitorData[]>([])
  const [media, setMedia] = useState<MonitorMediaItem[]>([])
  const [mediaIndex, setMediaIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [voiceArmed, setVoiceArmed] = useState(false)
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null)

  const prevSnapRef = useRef<Record<number, string | null>>({})
  const firstPollDoneRef = useRef(false)

  const fetchAll = async () => {
    try {
      const [queuesRes, mediaRes] = await Promise.all([
        fetch('/api/monitor/all-queues'),
        fetch('/api/monitor/media'),
      ])
      if (queuesRes.ok) setQueues(await queuesRes.json())
      if (mediaRes.ok) setMedia(await mediaRes.json())
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
    if (media.length <= 1) return
    const t = setInterval(() => {
      setMediaIndex((i) => (i + 1) % media.length)
    }, 12000)
    return () => clearInterval(t)
  }, [media.length])

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
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-700 text-xl">Cargando...</div>
      </div>
    )
  }

  const activeCalls = queues
    .filter((q) => q.current)
    .map((q) => ({
      service_id: q.service_id,
      service_name: q.service_name,
      current: q.current!,
    }))

  const currentMedia = media[mediaIndex] ?? null
  const videoEmbed = currentMedia?.kind === 'video' && currentMedia.body
    ? youtubeEmbedUrl(currentMedia.body)
    : null

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <div className="flex-1 grid lg:grid-cols-[1.2fr_0.8fr] min-h-0">
        <section className="p-6 sm:p-8 flex flex-col gap-6 bg-white border-r border-slate-200">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <Image
              src="/logo-hospital-santa-fe.png"
              alt="Hospital Santa Fe"
              width={220}
              height={60}
              className="h-14 w-auto object-contain"
              unoptimized
            />
            <div className="flex items-center gap-3">
              {!voiceArmed ? (
                <button
                  type="button"
                  onClick={enableVoiceClick}
                  className="px-4 py-2 rounded-lg bg-[#00816D] hover:bg-[#006b5a] text-white font-semibold text-sm"
                >
                  Activar voz
                </button>
              ) : (
                <button
                  type="button"
                  onClick={disableVoiceClick}
                  className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm"
                >
                  Silenciar
                </button>
              )}
              <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
                Inicio
              </Link>
            </div>
          </header>

          <div className="flex-1 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden min-h-[280px] flex flex-col">
            {currentMedia ? (
              currentMedia.kind === 'message' ? (
                <div className="p-6 flex-1 flex flex-col justify-center">
                  <p className="text-sm uppercase tracking-wide text-slate-500 mb-1">Información</p>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">{currentMedia.title}</h2>
                  {currentMedia.body && (
                    <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {currentMedia.body}
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative flex-1 min-h-0 bg-black">
                  {currentMedia.kind === 'image' && currentMedia.body && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentMedia.body}
                      alt={currentMedia.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {currentMedia.kind === 'video' && (
                    videoEmbed ? (
                      <iframe
                        title={currentMedia.title}
                        src={videoEmbed}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    ) : currentMedia.body ? (
                      <video
                        src={currentMedia.body}
                        className="absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : null
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                    <p className="text-white text-sm font-medium truncate">{currentMedia.title}</p>
                  </div>
                </div>
              )
            ) : (
              <div className="p-8 flex flex-col justify-center flex-1">
                <p className="text-sm uppercase tracking-wide text-slate-500 mb-2">Información</p>
                <p className="text-lg text-slate-700 leading-relaxed">
                  Por favor permanezca en la sala de espera. Será llamado por su número de turno en la
                  ventanilla indicada.
                </p>
                <p className="mt-4 text-sm text-slate-500">
                  El administrador puede cargar mensajes, imágenes o videos desde Administración → Contenido del monitor.
                </p>
              </div>
            )}
            {lastAnnouncement && (
              <p className="px-6 py-3 text-sm text-[#00816D] shrink-0" aria-live="polite">
                {lastAnnouncement}
              </p>
            )}
          </div>
        </section>

        <section className="bg-[#00816D] text-white p-6 sm:p-8 flex flex-col">
          <h2 className="text-3xl font-bold tracking-wide mb-6">TURNO</h2>
          <div className="flex-1 space-y-4 overflow-y-auto">
            {activeCalls.length === 0 ? (
              <p className="text-white/80 text-xl">En espera de llamados</p>
            ) : (
              activeCalls.map(({ service_id, service_name, current }) => (
                <div
                  key={`${service_id}-${current.ticket_number}`}
                  className="rounded-xl bg-white/10 border border-white/20 p-5"
                >
                  <div
                    className={`inline-block px-4 py-2 rounded-lg text-3xl font-bold mb-3 ${
                      isTriageService(service_name) ? 'bg-[#0B4F6C]' : 'bg-transparent'
                    }`}
                  >
                    {current.ticket_number}
                  </div>
                  <div className="text-sm text-white/80 mb-2">{service_name}</div>
                  {current.window_number ? (
                    <div className="inline-block bg-white text-slate-900 rounded-lg px-4 py-2 font-semibold">
                      Ventanilla {current.window_number}
                    </div>
                  ) : (
                    <div className="inline-block bg-white/80 text-slate-500 rounded-lg px-4 py-2 min-w-[8rem]">&nbsp;</div>
                  )}
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-white/60 mt-4">Actualizado: {new Date().toLocaleTimeString()}</p>
        </section>
      </div>

      <footer className="bg-[#00816D] text-white text-center py-4 px-4 text-lg sm:text-2xl font-semibold tracking-wide">
        Bienvenido al Hospital Santa Fe, por favor estar atento a su turno.
      </footer>
    </div>
  )
}
