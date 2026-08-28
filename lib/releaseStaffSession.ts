import { authHeaders } from '@/lib/authToken'

/** Libera ventanillas/turnos activos del agente antes de borrar la sesión local. */
export async function releaseStaffSession(accessToken?: string | null): Promise<void> {
  const token =
    accessToken ??
    (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
  if (!token) return

  try {
    await fetch('/api/tickets/release-my-session', {
      method: 'POST',
      headers: authHeaders(token),
    })
  } catch {
    // Mejor esfuerzo: no bloquear cierre de sesión si falla la red.
  }
}
