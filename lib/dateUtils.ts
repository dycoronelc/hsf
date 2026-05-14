/**
 * Utilidades para capturar y mostrar fechas en formato dd/mm/yyyy en toda la aplicación.
 */

const DD_MM_YYYY_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

/** Formatea un Date o string ISO a dd/mm/yyyy */
export function formatDateToDdMmYyyy(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/** Parsea una cadena dd/mm/yyyy y devuelve un Date o null si es inválida */
export function parseDdMmYyyy(s: string): Date | null {
  if (!s || !s.trim()) return null
  const trimmed = s.trim()
  const match = trimmed.match(DD_MM_YYYY_REGEX)
  if (!match) return null
  const [, d, m, y] = match
  const day = parseInt(d!, 10)
  const month = parseInt(m!, 10) - 1
  const year = parseInt(y!, 10)
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }
  return date
}

/** Convierte dd/mm/yyyy a yyyy-mm-dd para input type="date" (componentes locales, sin UTC). */
export function ddMmYyyyToIso(s: string): string {
  const date = parseDdMmYyyy(s)
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Convierte yyyy-mm-dd a dd/mm/yyyy usando fecha local (evita corrimiento por zona horaria). */
export function isoToDdMmYyyy(iso: string): string {
  if (!iso || !iso.trim()) return ''
  const t = iso.trim()
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const year = parseInt(m[1]!, 10)
    const month = parseInt(m[2]!, 10) - 1
    const day = parseInt(m[3]!, 10)
    const date = new Date(year, month, day)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      return ''
    }
    return formatDateToDdMmYyyy(date)
  }
  const date = new Date(t)
  if (Number.isNaN(date.getTime())) return ''
  return formatDateToDdMmYyyy(date)
}

/** Valida que una cadena sea dd/mm/yyyy válida */
export function isValidDdMmYyyy(s: string): boolean {
  return parseDdMmYyyy(s) !== null
}

/**
 * Formatea el valor mientras el usuario escribe: solo dígitos y barras,
 * auto-inserta barras después de dd y mm. Máx 10 caracteres.
 */
export function formatDateInput(value: string): string {
  const trimmed = value.trim()
  const isoDay = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDay) {
    return isoToDdMmYyyy(trimmed)
  }
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 2) {
    return digits
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}
