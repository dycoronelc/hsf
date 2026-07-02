/** Token JWT desde contexto React o localStorage (evita fallos si el state aún no hidrató). */
export function resolveAuthToken(contextToken: string | null | undefined): string | null {
  if (contextToken) return contextToken
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

export function authHeaders(
  contextToken: string | null | undefined,
  extra: HeadersInit = {},
): HeadersInit {
  const token = resolveAuthToken(contextToken)
  if (!token) return extra
  return { ...extra, Authorization: `Bearer ${token}` }
}

export function isAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403
}

export const DEFAULT_SESSION_EXPIRED_MESSAGE =
  'Su sesión ha expirado o ya no tiene permiso para continuar. Debe iniciar sesión de nuevo.'

export function handleAuthFailure(
  status: number,
  onSessionExpired: (message?: string) => void,
  message = DEFAULT_SESSION_EXPIRED_MESSAGE,
): boolean {
  if (isAuthFailureStatus(status)) {
    onSessionExpired(message)
    return true
  }
  return false
}
