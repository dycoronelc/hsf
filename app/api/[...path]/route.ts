import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function resolveApiBase(): string {
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  ).replace(/\/$/, '')
}

/** Evita ERR_CONTENT_DECODING_FAILED: fetch descomprime el body pero no debe reenviarse Content-Encoding. */
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
])

function sanitizeProxyResponseHeaders(upstream: Headers): Headers {
  const headers = new Headers()
  upstream.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })
  return headers
}

function buildProxyRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers()
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (
      lower === 'host' ||
      lower === 'connection' ||
      lower === 'content-length' ||
      lower === 'accept-encoding'
    ) {
      return
    }
    headers.set(key, value)
  })
  return headers
}

type RouteContext = { params: { path: string[] } }

async function proxy(req: NextRequest, context: RouteContext) {
  const subPath = context.params.path.join('/')
  const targetUrl = `${resolveApiBase()}/api/${subPath}${req.nextUrl.search}`

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers: buildProxyRequestHeaders(req),
    redirect: 'manual',
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
    init.duplex = 'half'
  }

  try {
    const upstream = await fetch(targetUrl, init)
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: sanitizeProxyResponseHeaders(upstream.headers),
    })
  } catch (err) {
    console.error(`API proxy failed (${targetUrl}):`, err)
    return NextResponse.json(
      {
        message:
          'No se pudo conectar con el servidor de la API. Configure API_URL en el servicio frontend (URL pública del backend en Railway).',
      },
      { status: 502 },
    )
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
