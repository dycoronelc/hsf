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

export function buildCallAnnouncement(params: {
  /** Conservado por compatibilidad; ya no se anuncia en voz. */
  serviceName?: string
  ticketNumber: string
  windowNumber: string | null | undefined
}): string {
  const ticket = ticketNumberToSpeechPhrase(params.ticketNumber)
  const windowLabel = params.windowNumber?.trim()
  const ventSpoken = windowLabel ? ventanillaToSpeech(windowLabel) : ''
  const approach = windowLabel
    ? `Por favor acercarse a Ventanilla ${ventSpoken}.`
    : 'Por favor acercarse.'
  return `Atención. Paciente con turno ${ticket}. ${approach}`
    .replace(/\s+/g, ' ')
    .trim()
}

let queue: string[] = []
let processing = false

function runNext(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  if (processing || queue.length === 0) return
  processing = true
  const text = queue.shift()!
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'es-PA'
  u.rate = 0.92
  u.pitch = 1
  u.volume = 1

  const voices = window.speechSynthesis.getVoices()
  const es =
    voices.find((v) => v.lang === 'es-PA') ||
    voices.find((v) => v.lang.startsWith('es-')) ||
    voices.find((v) => v.lang.includes('419'))
  if (es) u.voice = es

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
export function unlockSpeechWithTestPhrase(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  warmupSpeechVoices()
  const u = new SpeechSynthesisUtterance('Llamados activados.')
  u.lang = 'es-PA'
  u.volume = 0.6
  const voices = window.speechSynthesis.getVoices()
  const es =
    voices.find((v) => v.lang === 'es-PA') ||
    voices.find((v) => v.lang.startsWith('es-'))
  if (es) u.voice = es
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
