/** Extrae mensaje legible de respuestas de error del API NestJS. */
export function apiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const record = data as Record<string, unknown>
  if (typeof record.detail === 'string' && record.detail.trim()) return record.detail
  if (typeof record.message === 'string' && record.message.trim()) return record.message
  if (Array.isArray(record.message)) {
    const parts = record.message.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    if (parts.length > 0) return parts.join('; ')
  }
  return fallback
}

/** Mensaje amigable cuando fetch falla antes de recibir respuesta HTTP (red, timeout, proxy). */
export function fetchNetworkErrorMessage(err: unknown, context: string): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return `${context}: la solicitud tardó demasiado. Intente con archivos más livianos o una red más estable.`
  }
  if (err instanceof SyntaxError) {
    return `${context}: respuesta inválida del servidor. Intente de nuevo en unos segundos.`
  }
  if (err instanceof TypeError) {
    return `${context}: no se pudo conectar con el servidor. Verifique la red, que el sistema esté en línea y que los adjuntos no superen 15 MB cada uno.`
  }
  if (err instanceof Error && err.message.trim()) {
    if (/json|unexpected end/i.test(err.message)) {
      return `${context}: respuesta inválida del servidor. Intente de nuevo en unos segundos.`
    }
    return err.message
  }
  return `${context}: error inesperado al comunicarse con el servidor.`
}

/** Parsea JSON de forma segura; devuelve null si el cuerpo está vacío. */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text.trim()) return null
  return JSON.parse(text) as T
}
