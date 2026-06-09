/** Logo institucional (PNG). Sustituye al antiguo logo-hospital-santa-fe.svg. */
export const LOGO_BLANCO_PATH = '/logo-blanco.png'

/** Evita caché obsoleta: cada deploy en Railway cambia NEXT_PUBLIC_BUILD_ID. */
export function publicAssetUrl(path: string): string {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID?.trim()
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!buildId) return normalized
  return `${normalized}?v=${encodeURIComponent(buildId)}`
}

export const logoBlancoUrl = () => publicAssetUrl(LOGO_BLANCO_PATH)
