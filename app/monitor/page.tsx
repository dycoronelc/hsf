'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  buildCallAnnouncement,
  DEFAULT_MONITOR_VOICE_TEMPLATE,
  DEFAULT_SPEECH_PREFS,
  diffNewCalls,
  enqueueMonitorAnnouncement,
  listMonitorVoices,
  loadSpeechPrefs,
  saveSpeechPrefs,
  snapshotCurrentTickets,
  speakVoicePreview,
  startSpeechKeepAlive,
  unlockSpeechEngine,
  warmupSpeechVoices,
  type MonitorSpeechPrefs,
  type MonitorVoiceOption,
} from '@/lib/monitorVoice'

interface QueueItem {
  ticket_number: string
  service_name: string
  priority: string
  wait_time: number | null
  status: string
  window_number?: string | null
  call_count?: number | null
  called_at?: string | null
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
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null)
  const [voiceTemplate, setVoiceTemplate] = useState(DEFAULT_MONITOR_VOICE_TEMPLATE)
  const [speechPrefs, setSpeechPrefs] = useState<MonitorSpeechPrefs>(DEFAULT_SPEECH_PREFS)
  const [availableVoices, setAvailableVoices] = useState<MonitorVoiceOption[]>([])
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)

  const prevSnapRef = useRef<Record<number, string | null>>({})
  const firstPollDoneRef = useRef(false)
  const speechUnlockedRef = useRef(false)

  const refreshVoices = useCallback(() => {
    warmupSpeechVoices()
    setAvailableVoices(listMonitorVoices())
  }, [])

  const updateSpeechPrefs = useCallback((patch: Partial<MonitorSpeechPrefs>) => {
    setSpeechPrefs((prev) => {
      const next = { ...prev, ...patch }
      saveSpeechPrefs(next)
      return next
    })
  }, [])

  const ensureSpeechReady = useCallback((prefs?: MonitorSpeechPrefs) => {
    if (speechUnlockedRef.current) {
      try {
        window.speechSynthesis?.resume()
      } catch {
        /* ignore */
      }
      return
    }
    unlockSpeechEngine(prefs ?? loadSpeechPrefs())
    speechUnlockedRef.current = true
  }, [])

  const fetchAll = async () => {
    try {
      const [queuesRes, mediaRes, voiceRes] = await Promise.all([
        fetch('/api/monitor/all-queues'),
        fetch('/api/monitor/media'),
        fetch('/api/monitor/voice-template'),
      ])
      if (queuesRes.ok) setQueues(await queuesRes.json())
      if (mediaRes.ok) setMedia(await mediaRes.json())
      if (voiceRes.ok) {
        const data = await voiceRes.json()
        if (typeof data.template === 'string' && data.template.trim()) {
          setVoiceTemplate(data.template)
        }
      }
    } catch (error) {
      console.error('Error fetching monitor data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 3000)
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
    setSpeechPrefs(loadSpeechPrefs())
    refreshVoices()
    ensureSpeechReady(loadSpeechPrefs())
    const stopKeepAlive = startSpeechKeepAlive()

    const unlockOnGesture = () => {
      ensureSpeechReady(loadSpeechPrefs())
    }
    window.addEventListener('pointerdown', unlockOnGesture, { passive: true })
    window.addEventListener('keydown', unlockOnGesture)
    window.addEventListener('touchstart', unlockOnGesture, { passive: true })

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const onVoices = () => refreshVoices()
      window.speechSynthesis.addEventListener('voiceschanged', onVoices)
      return () => {
        stopKeepAlive()
        window.removeEventListener('pointerdown', unlockOnGesture)
        window.removeEventListener('keydown', unlockOnGesture)
        window.removeEventListener('touchstart', unlockOnGesture)
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      }
    }
    return () => {
      stopKeepAlive()
      window.removeEventListener('pointerdown', unlockOnGesture)
      window.removeEventListener('keydown', unlockOnGesture)
      window.removeEventListener('touchstart', unlockOnGesture)
    }
  }, [refreshVoices, ensureSpeechReady])

  useEffect(() => {
    if (loading) return
    if (queues.length === 0) return

    const next = snapshotCurrentTickets(queues)

    if (!firstPollDoneRef.current) {
      prevSnapRef.current = next
      firstPollDoneRef.current = true
      return
    }

    const prev = prevSnapRef.current
    const changes = diffNewCalls(prev, next)

    for (const ch of changes) {
      const q = queues.find((x) => x.service_id === ch.service_id)
      const cur = q?.current
      if (!cur || cur.ticket_number !== ch.ticket_number) continue

      ensureSpeechReady(speechPrefs)
      const text = buildCallAnnouncement({
        serviceName: q.service_name,
        ticketNumber: cur.ticket_number,
        windowNumber: cur.window_number,
        template: voiceTemplate,
      })
      setLastAnnouncement(text)
      enqueueMonitorAnnouncement(text)
    }

    prevSnapRef.current = next
  }, [queues, loading, voiceTemplate, speechPrefs, ensureSpeechReady])

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
    <div className="h-screen max-h-screen overflow-hidden bg-slate-100 text-slate-900 flex flex-col">
      {/* Multimedia ~78% / Turnos ~22% — columna de turnos más estrecha */}
      <div className="flex-1 grid min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(240px,22vw)]">
        <section className="p-4 sm:p-5 flex flex-col gap-3 bg-white border-r border-slate-200 min-h-0 min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3 shrink-0">
            <Image
              src="/logo-hospital-santa-fe.png"
              alt="Hospital Santa Fe"
              width={220}
              height={60}
              className="h-12 w-auto object-contain"
              unoptimized
            />
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-sm font-medium border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                Voz activa
              </span>
              <button
                type="button"
                onClick={() => {
                  refreshVoices()
                  ensureSpeechReady(speechPrefs)
                  setShowVoiceSettings((v) => !v)
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm"
              >
                Ajustes de voz
              </button>
              <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
                Inicio
              </Link>
            </div>
          </header>

          {showVoiceSettings && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 shrink-0">
              <p className="text-sm font-medium text-slate-800">Voz de este monitor</p>
              <p className="text-xs text-slate-500">
                La voz queda activa automáticamente. Las voces dependen del navegador y del equipo
                de esta pantalla; la preferencia se guarda aquí. Si el navegador bloquea el audio al
                iniciar, use «Probar» una vez o abra Chrome en modo kiosk con autoplay permitido.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Voz</label>
                  <select
                    value={speechPrefs.voiceURI}
                    onChange={(e) => updateSpeechPrefs({ voiceURI: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Automática (español)</option>
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang}){v.isSpanish ? '' : ' · no español'}
                      </option>
                    ))}
                  </select>
                  {availableVoices.length === 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      No se detectaron voces aún. Pulse «Probar» y vuelva a abrir ajustes.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Velocidad ({speechPrefs.rate.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min={0.7}
                    max={1.2}
                    step={0.02}
                    value={speechPrefs.rate}
                    onChange={(e) => updateSpeechPrefs({ rate: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tono ({speechPrefs.pitch.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min={0.7}
                    max={1.3}
                    step={0.05}
                    value={speechPrefs.pitch}
                    onChange={(e) => updateSpeechPrefs({ pitch: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    refreshVoices()
                    speechUnlockedRef.current = true
                    speakVoicePreview(loadSpeechPrefs())
                  }}
                  className="px-4 py-2 rounded-lg bg-[#00816D] text-white text-sm font-medium hover:bg-[#006b5a]"
                >
                  Probar
                </button>
                <button
                  type="button"
                  onClick={() => updateSpeechPrefs({ ...DEFAULT_SPEECH_PREFS })}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm hover:bg-slate-50"
                >
                  Restaurar
                </button>
              </div>
            </div>
          )}

          {/* Panel multimedia fijo 16:9 (recomendado 1920×1080) */}
          <div className="flex-1 min-h-0 flex flex-col justify-center">
            <div className="relative w-full mx-auto aspect-video max-h-full rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex flex-col">
              {currentMedia ? (
                currentMedia.kind === 'message' ? (
                  <div className="p-6 flex-1 flex flex-col justify-center overflow-auto">
                    <p className="text-sm uppercase tracking-wide text-slate-500 mb-1">Información</p>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">{currentMedia.title}</h2>
                    {currentMedia.body && (
                      <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {currentMedia.body}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black">
                    {currentMedia.kind === 'image' && currentMedia.body && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentMedia.body}
                        alt={currentMedia.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    {currentMedia.kind === 'video' &&
                      (videoEmbed ? (
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
                      ) : null)}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-2">
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
                    El administrador puede cargar mensajes, imágenes o videos desde Administración →
                    Contenido del monitor.
                  </p>
                </div>
              )}
            </div>
            {lastAnnouncement && (
              <p className="mt-2 px-1 text-sm text-[#00816D] shrink-0 truncate" aria-live="polite">
                {lastAnnouncement}
              </p>
            )}
          </div>
        </section>

        <section className="bg-[#00816D] text-white px-3 py-4 sm:px-4 sm:py-5 flex flex-col min-h-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-wide mb-3 shrink-0">TURNO</h2>
          <div className="flex-1 space-y-2 overflow-y-auto min-h-0 pr-0.5">
            {activeCalls.length === 0 ? (
              <p className="text-white/80 text-base">En espera de llamados</p>
            ) : (
              activeCalls.map(({ service_id, service_name, current }) => (
                <div
                  key={`${service_id}-${current.ticket_number}`}
                  className="rounded-lg bg-white/10 border border-white/20 px-3 py-2.5"
                >
                  <div
                    className={`inline-block px-2.5 py-1 rounded-md text-xl sm:text-2xl font-bold mb-1 ${
                      isTriageService(service_name) ? 'bg-[#0B4F6C]' : 'bg-transparent'
                    }`}
                  >
                    {current.ticket_number}
                  </div>
                  <div className="text-xs text-white/80 mb-1.5 leading-snug">{service_name}</div>
                  {current.window_number ? (
                    <div className="inline-block bg-white text-slate-900 rounded-md px-2.5 py-1 text-xs font-semibold leading-snug">
                      Ventanilla {current.window_number}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <p className="text-[10px] text-white/60 mt-2 shrink-0">
            Actualizado: {new Date().toLocaleTimeString()}
          </p>
        </section>
      </div>

      <footer className="bg-[#00816D] text-white text-center py-3 px-4 text-base sm:text-xl font-semibold tracking-wide shrink-0">
        Bienvenido al Hospital Santa Fe, por favor estar atento a su turno.
      </footer>
    </div>
  )
}
