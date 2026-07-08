/** Lee la expiración (ms) del payload JWT sin verificar firma (solo para timers en cliente). */
export function getJwtExpMs(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64)) as { exp?: number }
    if (typeof payload.exp !== 'number') return null
    return payload.exp * 1000
  } catch {
    return null
  }
}

/** Minutos antes del vencimiento para mostrar aviso al usuario. */
export const SESSION_WARNING_BEFORE_MS = 5 * 60 * 1000

export function msUntilSessionWarning(token: string): number | null {
  const expMs = getJwtExpMs(token)
  if (expMs == null) return null
  const warnAt = expMs - SESSION_WARNING_BEFORE_MS
  const remaining = warnAt - Date.now()
  return remaining > 0 ? remaining : 0
}

export function isJwtExpired(token: string): boolean {
  const expMs = getJwtExpMs(token)
  if (expMs == null) return false
  return Date.now() >= expMs
}
