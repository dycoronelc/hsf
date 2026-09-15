'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { canAccessOps } from '@/lib/authRoles'
import { authHeaders, handleAuthFailure } from '@/lib/authToken'
import { apiErrorMessage } from '@/lib/apiErrorMessage'

type OpsAlert = {
  level: 'ok' | 'warn' | 'critical'
  code: string
  message: string
}

type OpsStatus = {
  generatedAt: string
  host: {
    hostname: string
    platform: string
    release: string
    arch: string
    uptimeSeconds: number
  }
  process: {
    pid: number
    nodeVersion: string
    uptimeSeconds: number
    rssMb: number
    heapUsedMb: number
    heapTotalMb: number
  }
  memory: {
    totalMb: number
    freeMb: number
    usedMb: number
    usedPercent: number
  }
  cpu: {
    cores: number
    load1: number
    load5: number
    load15: number
  }
  disk: {
    available: boolean
    mounts: Array<{
      mount: string
      totalMb: number
      usedMb: number
      availableMb: number
      usedPercent: number
    }>
    error: string | null
  }
  database: {
    ok: boolean
    latencyMs: number
    error: string | null
  }
  systemd: {
    available: boolean
    services: Array<{ name: string; active: string; ok: boolean }>
    error: string | null
  }
  processes: {
    available: boolean
    items: Array<{
      label: string
      pid: number | null
      rssMb: number | null
      cmd: string | null
    }>
    error: string | null
  }
  queue: {
    ok: boolean
    activeCallsToday: number | null
    waitingQueue: number | null
    error: string | null
  }
  alerts: OpsAlert[]
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function alertClass(level: string): string {
  if (level === 'critical') return 'bg-red-50 border-red-300 text-red-900'
  if (level === 'warn') return 'bg-amber-50 border-amber-300 text-amber-900'
  return 'bg-green-50 border-green-300 text-green-900'
}

function statusPill(ok: boolean, label: string) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {label}
    </span>
  )
}

function Card({
  title,
  children,
  tone,
}: {
  title: string
  children: React.ReactNode
  tone?: 'ok' | 'warn' | 'critical'
}) {
  const border =
    tone === 'critical'
      ? 'border-red-300'
      : tone === 'warn'
        ? 'border-amber-300'
        : 'border-gray-200'
  return (
    <section className={`bg-white rounded-lg shadow border ${border} p-5`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  )
}

export default function AdminOpsPage() {
  const { isAuthenticated, user, token, authHydrated, notifySessionExpired } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<OpsStatus | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null)
  const [lastFetchAt, setLastFetchAt] = useState<string>('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    const started = performance.now()
    try {
      const res = await fetch('/api/ops/status', { headers: authHeaders(token) })
      const latency = Math.round(performance.now() - started)
      setApiLatencyMs(latency)
      if (handleAuthFailure(res.status, notifySessionExpired)) return
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(apiErrorMessage(body, 'No se pudo cargar el estado operativo'))
      }
      const data: OpsStatus = await res.json()
      setStatus(data)
      setLastFetchAt(new Date().toLocaleTimeString('es-PA'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [token, notifySessionExpired])

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!user || !canAccessOps(user)) {
      router.replace('/dashboard')
      return
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [authHydrated, isAuthenticated, user, router, load])

  if (!authHydrated || !isAuthenticated || !user || !canAccessOps(user)) {
    return null
  }

  const criticalCount = status?.alerts.filter((a) => a.level === 'critical').length ?? 0
  const warnCount = status?.alerts.filter((a) => a.level === 'warn').length ?? 0
  const overallTone: 'ok' | 'warn' | 'critical' =
    criticalCount > 0 ? 'critical' : warnCount > 0 ? 'warn' : 'ok'

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link href="/admin" className="text-hospital-blue hover:underline font-medium">
            ← Administración
          </Link>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitor operativo</h1>
            <p className="text-gray-600 mt-2">
              Salud del servidor, servicios, memoria y latencias para orientar el diagnóstico cuando
              algo falle.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {statusPill(overallTone === 'ok', overallTone === 'ok' ? 'Sin alertas críticas' : 'Revisar alertas')}
            <span className="text-gray-500">
              API {apiLatencyMs != null ? `${apiLatencyMs} ms` : '—'} · Actualizado {lastFetchAt || '—'}
            </span>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {status && (
          <div className="space-y-6">
            {status.alerts.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-900">Alertas</h2>
                {status.alerts.map((a) => (
                  <div
                    key={`${a.code}-${a.message}`}
                    className={`border rounded-lg px-4 py-3 text-sm ${alertClass(a.level)}`}
                  >
                    <span className="font-semibold uppercase text-xs mr-2">{a.level}</span>
                    {a.message}
                  </div>
                ))}
              </div>
            )}

            {status.alerts.length === 0 && (
              <div className="border border-green-200 bg-green-50 text-green-900 rounded-lg px-4 py-3 text-sm">
                Sin alertas: memoria, BD y servicios dentro de umbrales normales.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Card
                title="Base de datos"
                tone={!status.database.ok ? 'critical' : status.database.latencyMs > 500 ? 'warn' : 'ok'}
              >
                <p className="text-sm text-gray-700 mb-2">
                  Estado:{' '}
                  {statusPill(status.database.ok, status.database.ok ? 'OK' : 'FALLA')}
                </p>
                <p className="text-sm text-gray-700">
                  Latencia: <strong>{status.database.latencyMs} ms</strong>
                </p>
                {status.database.error && (
                  <p className="text-xs text-red-700 mt-2 break-words">{status.database.error}</p>
                )}
              </Card>

              <Card
                title="Memoria del host"
                tone={
                  status.memory.usedPercent >= 90
                    ? 'critical'
                    : status.memory.usedPercent >= 80
                      ? 'warn'
                      : 'ok'
                }
              >
                <p className="text-3xl font-bold text-gray-900">{status.memory.usedPercent}%</p>
                <p className="text-sm text-gray-600 mt-1">
                  Usada {status.memory.usedMb} MB / {status.memory.totalMb} MB · Libre{' '}
                  {status.memory.freeMb} MB
                </p>
              </Card>

              <Card title="CPU / carga">
                <p className="text-sm text-gray-700">
                  Cores: <strong>{status.cpu.cores}</strong>
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Load 1 / 5 / 15:{' '}
                  <strong>
                    {status.cpu.load1} / {status.cpu.load5} / {status.cpu.load15}
                  </strong>
                </p>
              </Card>

              <Card title="Proceso API (Nest)">
                <p className="text-sm text-gray-700">
                  PID {status.process.pid} · Node {status.process.nodeVersion}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  RSS <strong>{status.process.rssMb} MB</strong> · Heap{' '}
                  {status.process.heapUsedMb}/{status.process.heapTotalMb} MB
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Uptime proceso: {formatUptime(status.process.uptimeSeconds)}
                </p>
              </Card>

              <Card title="Procesos Node (host)">
                {status.processes.items.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin datos de procesos</p>
                ) : (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {status.processes.items.map((p) => (
                      <li key={`${p.label}-${p.pid}`}>
                        <strong>{p.label}</strong>: {p.rssMb != null ? `${p.rssMb} MB` : '—'} RSS
                        {p.pid != null ? ` (pid ${p.pid})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                {status.processes.error && (
                  <p className="text-xs text-amber-700 mt-2">{status.processes.error}</p>
                )}
              </Card>

              <Card title="Cola operativa (app)">
                <p className="text-sm text-gray-700">
                  Llamados hoy:{' '}
                  <strong>{status.queue.activeCallsToday ?? '—'}</strong>
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  En espera: <strong>{status.queue.waitingQueue ?? '—'}</strong>
                </p>
                {status.queue.error && (
                  <p className="text-xs text-red-700 mt-2">{status.queue.error}</p>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Servicios systemd">
                {!status.systemd.available ? (
                  <p className="text-sm text-gray-500">
                    {status.systemd.error || 'No disponible en este entorno'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {status.systemd.services.map((s) => (
                      <li
                        key={s.name}
                        className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0"
                      >
                        <span className="font-medium text-gray-800">{s.name}</span>
                        {statusPill(s.ok, s.active)}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Disco">
                {!status.disk.available || status.disk.mounts.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {status.disk.error || 'Sin montajes reportados'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {status.disk.mounts.map((m) => (
                      <li key={m.mount} className="text-sm text-gray-700">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{m.mount}</span>
                          <span
                            className={
                              m.usedPercent >= 90
                                ? 'text-red-700 font-semibold'
                                : m.usedPercent >= 80
                                  ? 'text-amber-700 font-semibold'
                                  : ''
                            }
                          >
                            {m.usedPercent}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {m.usedMb} / {m.totalMb} MB · libre {m.availableMb} MB
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card title="Host">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <dt className="text-gray-500">Hostname</dt>
                  <dd className="font-medium">{status.host.hostname}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">SO</dt>
                  <dd className="font-medium">
                    {status.host.platform} {status.host.release} ({status.host.arch})
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Uptime host</dt>
                  <dd className="font-medium">{formatUptime(status.host.uptimeSeconds)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Snapshot</dt>
                  <dd className="font-medium font-mono text-xs">{status.generatedAt}</dd>
                </div>
              </dl>
              <p className="text-xs text-gray-500 mt-4">
                Latencia de red medida desde el navegador hacia <code>/api/ops/status</code>:{' '}
                <strong>{apiLatencyMs != null ? `${apiLatencyMs} ms` : '—'}</strong>. Se actualiza
                cada 10 s.
              </p>
            </Card>
          </div>
        )}
      </div>
    </SiteLayout>
  )
}
