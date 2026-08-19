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
  service_code?: string | null
  priority: string
  triage_color?: string | null
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

function isTriageService(name: string, code?: string | null): boolean {
  if (code && code.toUpperCase() === 'TRIAGE') return true
  return /triage/i.test(name)
}

/** Color de triage solo tras evaluación y transferencia (fuera del servicio Triage). */
function monitorDisplayColor(
  serviceName: string,
  serviceCode: string | null | undefined,
  triageColor: string | null | undefined,
): string | null {
  if (isTriageService(serviceName, serviceCode)) return null
  return triageColor || null
}

const TRIAGE_COLOR_STYLES: Record<string, string> = {
  rojo: 'bg-red-600 text-white border-red-700',
  naranja: 'bg-orange-500 text-white border-orange-600',
  amarillo: 'bg-yellow-400 text-slate-900 border-yellow-500',
  verde: 'bg-green-600 text-white border-green-700',
  azul: 'bg-blue-600 text-white border-blue-700',
}

function ticketNumberClassName(displayColor: string | null, base: string): string {
  if (!displayColor) return base
  return `${base} px-3 py-1 rounded-lg border-2 ${TRIAGE_COLOR_STYLES[displayColor] || 'bg-slate-700 text-white'}`
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

/** Imágenes y mensajes rotan cada 12s; los videos esperan a terminar. */
const STILL_MEDIA_MS = 12_000
const YOUTUBE_MEDIA_MS = 90_000

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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const prevSnapRef = useRef<Record<number, string | null>>({})
  const firstPollDoneRef = useRef(false)
  const speechUnlockedRef = useRef(false)
  const [callFlashKey, setCallFlashKey] = useState<string | null>(null)
  const callFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const goNextMedia = useCallback(() => {
    setMediaIndex((i) => {
      if (media.length <= 1) return 0
      return (i + 1) % media.length
    })
  }, [media.length])

  useEffect(() => {
    if (mediaIndex >= media.length && media.length > 0) {
      setMediaIndex(0)
    }
  }, [media.length, mediaIndex])

  useEffect(() => {
    if (media.length <= 1) return
    const item = media[mediaIndex]
    if (!item) return
    if (item.kind === 'video') {
      const isYoutube = !!(item.body && youtubeEmbedUrl(item.body))
      if (isYoutube) {
        const t = window.setTimeout(goNextMedia, YOUTUBE_MEDIA_MS)
        return () => window.clearTimeout(t)
      }
      const t = window.setTimeout(goNextMedia, 15 * 60 * 1000)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(goNextMedia, STILL_MEDIA_MS)
    return () => window.clearTimeout(t)
  }, [media, mediaIndex, goNextMedia])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

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

      const flashKey = `${ch.service_id}-${cur.ticket_number}-${cur.call_count ?? 0}-${cur.called_at ?? ''}`
      setCallFlashKey(flashKey)
      if (callFlashTimerRef.current) clearTimeout(callFlashTimerRef.current)
      callFlashTimerRef.current = setTimeout(() => {
        setCallFlashKey((k) => (k === flashKey ? null : k))
      }, 4500)
    }

    prevSnapRef.current = next
  }, [queues, loading, voiceTemplate, speechPrefs, ensureSpeechReady])

  useEffect(() => {
    return () => {
      if (callFlashTimerRef.current) clearTimeout(callFlashTimerRef.current)
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
    // Orden de llamado: más reciente arriba
    .sort((a, b) => {
      const ta = a.current.called_at ? Date.parse(a.current.called_at) : 0
      const tb = b.current.called_at ? Date.parse(b.current.called_at) : 0
      return tb - ta
    })

  // Máximo 4 turnos en pantalla
  const visibleCalls = activeCalls.slice(0, 4)
  const featuredCall = visibleCalls[0] ?? null
  const featuredKey = featuredCall
    ? `${featuredCall.service_id}-${featuredCall.current.ticket_number}-${featuredCall.current.call_count ?? 0}-${featuredCall.current.called_at ?? ''}`
    : null
  const isFreshCall = !!featuredKey && featuredKey === callFlashKey

  const currentMedia = media[mediaIndex] ?? null
  const videoEmbed = currentMedia?.kind === 'video' && currentMedia.body
    ? youtubeEmbedUrl(currentMedia.body)
    : null

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-100 text-slate-900 flex flex-col">
      {/* Multimedia + columna de turnos (máx. 4, más reciente arriba) */}
      <div className="flex-1 grid min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(300px,30vw)]">
        <section className="p-4 sm:p-5 flex flex-col gap-3 bg-white border-r border-slate-200 min-h-0 min-w-0">
          <header className="flex items-center justify-between gap-3 shrink-0">
            <Image
              src="/logo-hospital-santa-fe.png"
              alt="Hospital Santa Fe"
              width={360}
              height={120}
              className="h-16 sm:h-20 lg:h-24 w-auto object-contain"
              unoptimized
              priority
            />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="Abrir menú del monitor"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg z-30"
                >
                  <div className="px-4 py-2 text-sm text-emerald-800 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                    Voz activa
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      refreshVoices()
                      ensureSpeechReady(speechPrefs)
                      setShowVoiceSettings(true)
                      setMenuOpen(false)
                    }}
                  >
                    Ajustes de voz
                  </button>
                  <Link
                    href="/"
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Inicio
                  </Link>
                </div>
              )}
            </div>
          </header>

          {showVoiceSettings && (
            <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4 pt-20">
              <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">Voz de este monitor</p>
                  <button
                    type="button"
                    onClick={() => setShowVoiceSettings(false)}
                    className="text-sm text-slate-500 hover:text-slate-800"
                  >
                    Cerrar
                  </button>
                </div>
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
            </div>
          )}

          {/* Panel multimedia: ocupa todo el espacio izquierdo (el llamado se resalta en TURNO) */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="relative w-full h-full min-h-0 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex flex-col">
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
                          key={currentMedia.id}
                          src={currentMedia.body}
                          className="absolute inset-0 w-full h-full object-contain bg-black"
                          autoPlay
                          muted
                          loop={media.length <= 1}
                          playsInline
                          onEnded={() => {
                            if (media.length > 1) goNextMedia()
                          }}
                          onError={() => {
                            if (media.length > 1) goNextMedia()
                          }}
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
              <p className="sr-only" aria-live="polite">
                {lastAnnouncement}
              </p>
            )}
          </div>
        </section>

        <section className="bg-[#00816D] text-white px-3 py-4 sm:px-4 sm:py-5 flex flex-col min-h-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-wide mb-4 shrink-0 uppercase">
            Turno
          </h2>
          <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
            {visibleCalls.length === 0 ? (
              <p className="text-white/80 text-lg">En espera de llamados</p>
            ) : (
              visibleCalls.map(({ service_id, service_name, current }, index) => {
                const callKey = `${service_id}-${current.ticket_number}-${current.call_count ?? 0}-${current.called_at ?? ''}`
                const isTop = index === 0
                const displayColor = monitorDisplayColor(
                  service_name,
                  current.service_code,
                  current.triage_color,
                )
                return (
                  <div
                    key={callKey}
                    className={`rounded-xl border-2 px-3 py-3 sm:px-4 sm:py-4 flex-1 min-h-0 flex flex-col justify-center ${
                      isTop && isFreshCall
                        ? 'bg-white text-slate-900 border-amber-300 monitor-call-flash'
                        : isTop
                          ? 'bg-white text-slate-900 border-white'
                          : 'bg-white/10 border-white/25 text-white'
                    }`}
                  >
                    {isTop && (
                      <p
                        className={`text-xs font-bold uppercase tracking-[0.16em] mb-1 flex items-center gap-1.5 ${
                          isTop ? 'text-[#00816D]' : 'text-white/80'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full animate-pulse ${isTop ? 'bg-[#00816D]' : 'bg-white'}`}
                          aria-hidden
                        />
                        Llamando
                      </p>
                    )}
                    <p
                      className={ticketNumberClassName(
                        displayColor,
                        `font-black tracking-tight leading-none break-all ${
                          isTop ? 'text-slate-900' : 'text-white'
                        } text-5xl sm:text-6xl lg:text-7xl`,
                      )}
                    >
                      {current.ticket_number}
                    </p>
                    <p
                      className={`mt-2 text-sm sm:text-base font-medium leading-snug truncate ${
                        isTop ? 'text-slate-600' : 'text-white/85'
                      }`}
                    >
                      {service_name}
                    </p>
                    {current.window_number ? (
                      <div
                        className={`mt-3 inline-block self-start rounded-lg px-3 py-1.5 text-sm sm:text-base font-bold ${
                          isTop ? 'bg-[#00816D] text-white' : 'bg-white text-slate-900'
                        }`}
                      >
                        {current.window_number}
                      </div>
                    ) : null}
                  </div>
                )
              })
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

      <style jsx global>{`
        @keyframes monitor-call-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
          }
          70% {
            box-shadow: 0 0 0 16px rgba(251, 191, 36, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
          }
        }
        .monitor-call-flash {
          animation: monitor-call-pulse 1.1s ease-out 3;
        }
      `}</style>
    </div>
  )
}
