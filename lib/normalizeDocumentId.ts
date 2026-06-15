/** Normalización básica de cédula/pasaporte en el cliente (alineada con el backend). */
import { filterDocumentIdInput, isValidDocumentIdInput } from '@/lib/validation/person-fields'

export function normalizeDocumentId(raw: string, tipoIdentificacion: string): string {
  const filtered = filterDocumentIdInput(raw.replace(/\s+/g, ''))
  const trimmed = filtered.trim()
  if (!trimmed) return ''
  if (!isValidDocumentIdInput(trimmed)) return trimmed
  const tipo = tipoIdentificacion.trim().toUpperCase()
  if (tipo === 'P') return trimmed.toUpperCase()

  const upper = trimmed.toUpperCase()
  const cedulaCompleta =
    /^(?:PE|AE|E|N|[23456789](?:AV|PI)?|1[0123]?(?:AV|PI)?)-\d{1,4}-\d{1,6}$/i
  if (cedulaCompleta.test(upper)) return upper

  if (/^AE\d{5,}$/i.test(upper)) {
    const digits = upper.slice(2)
    return `AE-${digits.slice(0, digits.length - 4)}-${digits.slice(-4)}`
  }
  if (/^E\d{6,9}$/i.test(upper)) {
    const digits = upper.slice(1)
    return `E-${digits.slice(0, 1)}-${digits.slice(1)}`
  }
  if (/^\d{7,12}$/.test(upper)) {
    return `${upper.slice(0, 1)}-${upper.slice(1, 4)}-${upper.slice(4)}`
  }
  return upper
}
