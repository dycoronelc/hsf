/** Zona horaria operativa del hospital (Panamá, UTC-5 todo el año, sin DST). */
export const APP_TIMEZONE = 'America/Panama'
const APP_OFFSET = '-05:00'

function parseInstant(value?: string | Date | null): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const raw = value.trim()

    // Con offset explícito (±HH:MM o Z): el instante es inequívoco.
    if (/([zZ]|[+-]\d{2}:\d{2})$/.test(raw)) {
      const parsed = new Date(raw)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }

    // ISO / SQL naive: tratar como hora de pared en Panamá (no como UTC).
    // Antes se forzaba "Z" y, si el backend ya venía en hora local, la UI adelantaba ~5 h.
    const naive = raw.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/,
    )
    if (naive) {
      const [, y, mo, d, h, mi, s] = naive
      const iso = `${y}-${mo}-${d}T${h}:${mi}:${s ?? '00'}${APP_OFFSET}`
      const parsed = new Date(iso)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }

    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? ''
}

/** Fecha DD-MM-YYYY y hora 12:38 P.M. en hora de Panamá. */
export function formatTicketGeneratedAt(value?: string | Date | null): {
  date: string
  time: string
} {
  const d = parseInstant(value)

  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d)

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d)

  const dayPeriod = part(timeParts, 'dayPeriod').toUpperCase().replace(/\./g, '')
  const period = dayPeriod.startsWith('PM') ? 'P.M.' : 'A.M.'

  return {
    date: `${part(dateParts, 'day')}-${part(dateParts, 'month')}-${part(dateParts, 'year')}`,
    time: `${part(timeParts, 'hour')}:${part(timeParts, 'minute')} ${period}`,
  }
}

export function formatInAppTimezone(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!value) return '—'
  const d = parseInstant(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('es-PA', { timeZone: APP_TIMEZONE, ...options })
}
