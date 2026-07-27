/** Mensaje estándar para correos inválidos en formularios. */
export const EMAIL_MESSAGE =
  'Ingrese un correo electrónico válido (ejemplo: nombre@dominio.com)'

/**
 * Validación práctica de email (formato).
 * Rechaza espacios, varios @, dominio sin TLD y caracteres claramente inválidos.
 */
export function isValidEmail(value: string | null | undefined): boolean {
  const email = (value ?? '').trim()
  if (!email || email.length > 254) return false
  if (/\s/.test(email)) return false
  if ((email.match(/@/g) || []).length !== 1) return false

  const [local, domain] = email.split('@')
  if (!local || !domain) return false
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.')) return false
  if (local.includes('..')) return false
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false

  if (domain.length > 253 || domain.startsWith('-') || domain.endsWith('-')) return false
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false
  // Al menos un punto y TLD de 2+ letras
  if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domain)) return false
  const labels = domain.split('.')
  if (labels.some((label) => !label || label.length > 63 || !/^[A-Za-z0-9-]+$/.test(label))) {
    return false
  }
  return true
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}
