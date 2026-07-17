/**
 * Anuncios por voz para la pantalla de llamados (/monitor).
 * Usa Web Speech API (síntesis en español). Requiere gesto del usuario para activar (política del navegador).
 */

const DIGIT_WORDS = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
]

const SPEECH_PREFS_KEY = 'hospital-sf-monitor-speech-prefs'

export type MonitorSpeechPrefs = {
  /** `voiceURI` de SpeechSynthesisVoice, o vacío = automática en español */
  voiceURI: string
  rate: number
  pitch: number
}

export const DEFAULT_SPEECH_PREFS: MonitorSpeechPrefs = {
  voiceURI: '',
  rate: 0.92,
  pitch: 1,
}

/** Convierte un número de turno tipo "RAD-042" o "ADM-001" a frase clara por micrófono/TV */
export function ticketNumberToSpeechPhrase(ticketNumber: string): string {
  const t = ticketNumber.trim().toUpperCase().replace(/\s+/g, '')
  const parts = t.split('-').filter(Boolean)
  if (parts.length >= 2) {
    const prefix = parts[0]
    const suffixDigits = parts
      .slice(1)
      .join('')
      .replace(/\D/g, '')
    const letters = prefix.split('').join(' ')
    const nums = suffixDigits
      .split('')
      .map((d) => DIGIT_WORDS[Number(d)])
      .join(', ')
    return nums ? `${letters}, ${nums}` : letters
  }
  return t
    .split('')
    .map((ch) => (/^\d$/.test(ch) ? DIGIT_WORDS[Number(ch)] : ch))
    .join(', ')
}

function ventanillaToSpeech(windowNumber: string): string {
  const w = windowNumber.trim()
  if (!w) return ''
  if (/^\d+$/.test(w)) {
    return w
      .split('')
      .map((d) => DIGIT_WORDS[Number(d)])
      .join(' ')
  }
  return w
}

/** Plantilla por defecto (misma que backend `DEFAULT_MONITOR_VOICE_TEMPLATE`). */
export const DEFAULT_MONITOR_VOICE_TEMPLATE =
  'Atención. Paciente con turno {turno}. Por favor acercarse a Ventanilla {ventanilla}.'

/**
 * Construye el anuncio de voz a partir de una plantilla con variables:
 * `{turno}`, `{ventanilla}`, `{servicio}`.
 */
export function buildCallAnnouncement(params: {
  serviceName?: string
  ticketNumber: string
  windowNumber: string | null | undefined
  template?: string | null
}): string {
  const ticket = ticketNumberToSpeechPhrase(params.ticketNumber)
  const windowLabel = params.windowNumber?.trim()
  const ventSpoken = windowLabel ? ventanillaToSpeech(windowLabel) : ''
  const servicio = (params.serviceName || '').trim()
  const template = params.template?.trim() || DEFAULT_MONITOR_VOICE_TEMPLATE

  return template
    .replace(/\{turno\}/gi, ticket)
    .replace(/\{ventanilla\}/gi, ventSpoken)
    .replace(/\{servicio\}/gi, servicio)
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function loadSpeechPrefs(): MonitorSpeechPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_SPEECH_PREFS }
  try {
    const raw = localStorage.getItem(SPEECH_PREFS_KEY)
    if (!raw) return { ...DEFAULT_SPEECH_PREFS }
    const parsed = JSON.parse(raw) as Partial<MonitorSpeechPrefs>
    return {
      voiceURI: typeof parsed.voiceURI === 'string' ? parsed.voiceURI : '',
      rate: clamp(Number(parsed.rate), 0.6, 1.4) || DEFAULT_SPEECH_PREFS.rate,
      pitch: clamp(Number(parsed.pitch), 0.6, 1.4) || DEFAULT_SPEECH_PREFS.pitch,
    }
  } catch {
    return { ...DEFAULT_SPEECH_PREFS }
  }
}

export function saveSpeechPrefs(prefs: MonitorSpeechPrefs): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      SPEECH_PREFS_KEY,
      JSON.stringify({
        voiceURI: prefs.voiceURI,
        rate: clamp(prefs.rate, 0.6, 1.4),
        pitch: clamp(prefs.pitch, 0.6, 1.4),
      }),
    )
  } catch {
    /* ignore */
  }
}

export type MonitorVoiceOption = {
  voiceURI: string
  name: string
  lang: string
  isSpanish: boolean
}

function isSpanishLang(lang: string): boolean {
  const l = lang.toLowerCase()
  return l.startsWith('es') || l.includes('419')
}

/** Voces del navegador/equipo; español primero. */
export function listMonitorVoices(): MonitorVoiceOption[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const voices = window.speechSynthesis.getVoices()
  const mapped = voices.map((v) => ({
    voiceURI: v.voiceURI,
    name: v.name,
    lang: v.lang,
    isSpanish: isSpanishLang(v.lang),
  }))
  mapped.sort((a, b) => {
    if (a.isSpanish !== b.isSpanish) return a.isSpanish ? -1 : 1
    return a.name.localeCompare(b.name, 'es')
  })
  return mapped
}

function resolveVoice(prefs: MonitorSpeechPrefs): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (prefs.voiceURI) {
    const chosen = voices.find((v) => v.voiceURI === prefs.voiceURI)
    if (chosen) return chosen
  }
  return (
    voices.find((v) => v.lang === 'es-PA') ||
    voices.find((v) => v.lang.toLowerCase().startsWith('es-')) ||
    voices.find((v) => v.lang.toLowerCase().includes('419')) ||
    voices.find((v) => isSpanishLang(v.lang)) ||
    null
  )
}

function applyPrefsToUtterance(u: SpeechSynthesisUtterance, prefs?: MonitorSpeechPrefs): void {
  const p = prefs ?? loadSpeechPrefs()
  u.lang = 'es-PA'
  u.rate = clamp(p.rate, 0.6, 1.4)
  u.pitch = clamp(p.pitch, 0.6, 1.4)
  u.volume = 1
  const voice = resolveVoice(p)
  if (voice) {
    u.voice = voice
    u.lang = voice.lang || 'es-PA'
  }
}

let queue: string[] = []
let processing = false

function runNext(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  if (processing || queue.length === 0) return
  processing = true
  const text = queue.shift()!
  const u = new SpeechSynthesisUtterance(text)
  applyPrefsToUtterance(u)

  u.onend = () => {
    processing = false
    runNext()
  }
  u.onerror = () => {
    processing = false
    runNext()
  }
  window.speechSynthesis.speak(u)
}

/** Encola un anuncio (no se solapan). */
export function enqueueMonitorAnnouncement(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  queue.push(text)
  runNext()
}

export function clearAnnouncementQueue(): void {
  queue = []
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  processing = false
}

/** Precarga voces (Chrome carga voces de forma asíncrona). */
export function warmupSpeechVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.getVoices()
}

/** Prueba breve para desbloquear audio tras clic del usuario. */
export function unlockSpeechWithTestPhrase(prefs?: MonitorSpeechPrefs): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  warmupSpeechVoices()
  const u = new SpeechSynthesisUtterance('Llamados activados.')
  applyPrefsToUtterance(u, prefs)
  u.volume = 0.7
  window.speechSynthesis.speak(u)
}

/** Reproduce una frase de prueba con las preferencias indicadas. */
export function speakVoicePreview(prefs?: MonitorSpeechPrefs): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  warmupSpeechVoices()
  clearAnnouncementQueue()
  const u = new SpeechSynthesisUtterance(
    'Atención. Paciente con turno L R, ocho, cinco, ocho, cero. Por favor acercarse a Ventanilla dos.',
  )
  applyPrefsToUtterance(u, prefs)
  window.speechSynthesis.speak(u)
}

export function snapshotCurrentTickets(
  queues: Array<{ service_id: number; current?: { ticket_number: string } | null }>,
): Record<number, string | null> {
  const m: Record<number, string | null> = {}
  for (const q of queues) {
    m[q.service_id] = q.current?.ticket_number ?? null
  }
  return m
}

export function diffNewCalls(
  prev: Record<number, string | null>,
  next: Record<number, string | null>,
): Array<{ service_id: number; ticket_number: string }> {
  const out: Array<{ service_id: number; ticket_number: string }> = []
  for (const sid of Object.keys(next)) {
    const id = Number(sid)
    const newNum = next[id]
    const oldNum = prev[id] ?? null
    if (newNum !== null && newNum !== oldNum) {
      out.push({ service_id: id, ticket_number: newNum })
    }
  }
  return out
}
