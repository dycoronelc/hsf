'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../providers'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../components/SiteLayout'
import { formatDateInput, ddMmYyyyToIso } from '@/lib/dateUtils'
import { canAccessReports } from '@/lib/authRoles'
import { authHeaders, handleAuthFailure } from '@/lib/authToken'

interface SummaryReport {
  period: { start: string; end: string }
  tickets: {
    total: number
    completed: number
    noShows: number
    averageWaitTime: number
    averageServiceTime: number
  }
  satisfaction: {
    totalSurveys: number
    averageNPS: number
    averageCSAT: number
    responseRate: number
  }
  preadmissions?: {
    total: number
    byArrivalState: Record<string, number>
    awaitingArrival: number
    ticketGeneratedCount: number
    ticketGeneratedRatePercent: number
    averageMinutesSubmitToPhysicalArrival: number
  }
}

interface RealTimeReport {
  timestamp: string
  activeTickets: number
  byService: { [key: string]: any }
  preadmissionsToday?: {
    total: number
    byArrivalState: Record<string, number>
  }
}

interface PreadmissionRow {
  id: number
  departamento: string
  cedula: string
  name1: string
  apellido1: string
  email: string
  fechapreadmision: string
  status: string
  arrivalState?: string
  confirmedArrivalAt?: string | null
  ticketId?: number | null
}

const ARRIVAL_LABELS: Record<string, string> = {
  registrado: 'Registrado',
  espera_llegada: 'En espera de llegada',
  paciente_presente: 'Paciente presente',
  ticket_generado: 'Ticket generado',
}

export default function ReportsPage() {
  const { isAuthenticated, token, user, authHydrated, notifySessionExpired } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'summary' | 'realtime' | 'efficiency' | 'preadmissions'>('summary')
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [realtime, setRealtime] = useState<RealTimeReport | null>(null)
  const [preadmissions, setPreadmissions] = useState<PreadmissionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPre, setLoadingPre] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [preTipo, setPreTipo] = useState('')
  const [preDocumento, setPreDocumento] = useState('')
  const [preArrivalState, setPreArrivalState] = useState('')

  const loadSummary = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const startIso = startDate ? ddMmYyyyToIso(startDate) : ''
      const endIso = endDate ? ddMmYyyyToIso(endDate) : ''
      if (startIso) params.append('startDate', startIso)
      if (endIso) params.append('endDate', endIso)

      const response = await fetch(
        `/api/reports/summary?${params.toString()}`,
        { headers: authHeaders(token) },
      )
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Error loading summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRealTime = async () => {
    try {
      const response = await fetch('/api/reports/realtime', {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        const data = await response.json()
        setRealtime(data)
      }
    } catch (error) {
      console.error('Error loading realtime:', error)
    }
  }

  const loadPreadmissions = async () => {
    if (!token) return
    setLoadingPre(true)
    try {
      const params = new URLSearchParams()
      const startIso = startDate ? ddMmYyyyToIso(startDate) : ''
      const endIso = endDate ? ddMmYyyyToIso(endDate) : ''
      if (startIso) params.append('startDate', startIso)
      if (endIso) params.append('endDate', endIso)
      if (preTipo === 'RAD' || preTipo === 'LAB') params.append('tipo', preTipo)
      if (preDocumento.trim()) params.append('documento', preDocumento.trim())
      if (preArrivalState) params.append('arrivalState', preArrivalState)

      const response = await fetch(`/api/reports/preadmissions?${params.toString()}`, {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        const data = await response.json()
        setPreadmissions(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading preadmissions report:', error)
    } finally {
      setLoadingPre(false)
    }
  }

  const exportPreadmissionsExcel = async () => {
    if (!token) return
    try {
      const params = new URLSearchParams({ format: 'excel' })
      const startIso = startDate ? ddMmYyyyToIso(startDate) : ''
      const endIso = endDate ? ddMmYyyyToIso(endDate) : ''
      if (startIso) params.append('startDate', startIso)
      if (endIso) params.append('endDate', endIso)
      if (preTipo === 'RAD' || preTipo === 'LAB') params.append('tipo', preTipo)
      if (preDocumento.trim()) params.append('documento', preDocumento.trim())
      if (preArrivalState) params.append('arrivalState', preArrivalState)

      const response = await fetch(`/api/reports/preadmissions/export?${params.toString()}`, {
        headers: authHeaders(token),
      })
      if (
        handleAuthFailure(
          response.status,
          notifySessionExpired,
          'Su sesión ha expirado o no tiene permiso para exportar reportes. Debe iniciar sesión de nuevo.',
        )
      ) {
        return
      }
      if (!response.ok) return
      const data = await response.json()
      const excel = data.excel as string
      const blob = new Blob([excel], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `preadmisiones_${new Date().toISOString().slice(0, 10)}.xls`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      console.error('Export Excel failed:', e)
    }
  }

  const exportPreadmissionsCsv = async () => {
    if (!token) return
    try {
      const params = new URLSearchParams({ format: 'csv' })
      const startIso = startDate ? ddMmYyyyToIso(startDate) : ''
      const endIso = endDate ? ddMmYyyyToIso(endDate) : ''
      if (startIso) params.append('startDate', startIso)
      if (endIso) params.append('endDate', endIso)
      if (preTipo === 'RAD' || preTipo === 'LAB') params.append('tipo', preTipo)
      if (preDocumento.trim()) params.append('documento', preDocumento.trim())
      if (preArrivalState) params.append('arrivalState', preArrivalState)

      const response = await fetch(`/api/reports/preadmissions/export?${params.toString()}`, {
        headers: authHeaders(token),
      })
      if (
        handleAuthFailure(
          response.status,
          notifySessionExpired,
          'Su sesión ha expirado o no tiene permiso para exportar reportes. Debe iniciar sesión de nuevo.',
        )
      ) {
        return
      }
      if (!response.ok) return
      const data = await response.json()
      const csv = data.csv as string
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `preadmisiones_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      console.error('Export CSV failed:', e)
    }
  }

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!canAccessReports(user?.role)) {
      router.replace('/dashboard')
      return
    }
    loadRealTime()
    const interval = setInterval(loadRealTime, 30000)
    return () => clearInterval(interval)
  }, [authHydrated, isAuthenticated, user?.role, router])

  useEffect(() => {
    if (!authHydrated || !isAuthenticated || !canAccessReports(user?.role)) return
    if (activeTab === 'summary') {
      loadSummary()
    } else if (activeTab === 'realtime') {
      loadRealTime()
    } else if (activeTab === 'preadmissions') {
      loadPreadmissions()
    }
  }, [authHydrated, isAuthenticated, user?.role, activeTab, startDate, endDate, preTipo, preDocumento, preArrivalState, token])

  if (!authHydrated || !isAuthenticated || !canAccessReports(user?.role)) {
    return null
  }

  return (
    <SiteLayout>
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-4">
          <Link href="/dashboard" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
            ← Volver al dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Reportes y Analítica</h1>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'summary'
                    ? 'border-hospital-blue text-hospital-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('realtime')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'realtime'
                    ? 'border-hospital-blue text-hospital-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tiempo Real
              </button>
              <button
                onClick={() => setActiveTab('efficiency')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'efficiency'
                    ? 'border-hospital-blue text-hospital-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Eficiencia
              </button>
              <button
                onClick={() => setActiveTab('preadmissions')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'preadmissions'
                    ? 'border-hospital-blue text-hospital-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Preadmisiones
              </button>
            </nav>
          </div>
        </div>

        {/* Filtros de fecha (resumen y listado preadmisiones) */}
        {(activeTab === 'summary' || activeTab === 'preadmissions') && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio (DD/MM/YYYY)</label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(formatDateInput(e.target.value))}
                placeholder="dd/mm/yyyy"
                maxLength={10}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin (DD/MM/YYYY)</label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(formatDateInput(e.target.value))}
                placeholder="dd/mm/yyyy"
                maxLength={10}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Contenido de tabs */}
        <>
            {activeTab === 'summary' && loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hospital-blue mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando reportes...</p>
              </div>
            )}
            {activeTab === 'summary' && !loading && summary && (
              <>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Turnos</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold">{summary.tickets.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completados:</span>
                      <span className="font-semibold text-green-600">{summary.tickets.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">No Shows:</span>
                      <span className="font-semibold text-red-600">{summary.tickets.noShows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiempo Espera Promedio:</span>
                      <span className="font-semibold">{summary.tickets.averageWaitTime.toFixed(1)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiempo Atención Promedio:</span>
                      <span className="font-semibold">{summary.tickets.averageServiceTime.toFixed(1)} min</span>
                    </div>
                  </div>
                </div>


                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Satisfacción</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Encuestas Recibidas:</span>
                      <span className="font-semibold">{summary.satisfaction.totalSurveys}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">NPS Promedio:</span>
                      <span className="font-semibold">{summary.satisfaction.averageNPS}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CSAT Promedio:</span>
                      <span className="font-semibold">{summary.satisfaction.averageCSAT}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasa de Respuesta:</span>
                      <span className="font-semibold">{summary.satisfaction.responseRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {summary.preadmissions && (
                <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">Preadmisión y llegadas (período)</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Distribución por estado de llegada y conversión a ticket de admisión.
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                      <p className="text-sm text-gray-600">Total preadmisiones</p>
                      <p className="text-2xl font-bold text-gray-900">{summary.preadmissions.total}</p>
                    </div>
                    <div className="border border-gray-100 rounded-lg p-4 bg-amber-50">
                      <p className="text-sm text-gray-600">Pendientes de llegada</p>
                      <p className="text-2xl font-bold text-amber-800">{summary.preadmissions.awaitingArrival}</p>
                    </div>
                    <div className="border border-gray-100 rounded-lg p-4 bg-green-50">
                      <p className="text-sm text-gray-600">Con ticket generado</p>
                      <p className="text-2xl font-bold text-green-800">{summary.preadmissions.ticketGeneratedCount}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {summary.preadmissions.ticketGeneratedRatePercent}% del total
                      </p>
                    </div>
                    <div className="border border-gray-100 rounded-lg p-4 bg-blue-50">
                      <p className="text-sm text-gray-600">Promedio envío → llegada física</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {summary.preadmissions.averageMinutesSubmitToPhysicalArrival.toFixed(1)} min
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-600">
                          <th className="py-2 pr-4">Estado de llegada</th>
                          <th className="py-2 pr-4">Cantidad</th>
                          <th className="py-2">% del total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(summary.preadmissions.byArrivalState).map(([key, count]) => (
                          <tr key={key} className="border-b border-gray-100">
                            <td className="py-2 pr-4">{ARRIVAL_LABELS[key] ?? key}</td>
                            <td className="py-2 pr-4 font-medium">{count}</td>
                            <td className="py-2">
                              {summary.preadmissions!.total > 0
                                ? ((count / summary.preadmissions!.total) * 100).toFixed(1)
                                : '0'}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              </>
            )}

            {activeTab === 'realtime' && realtime && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Estado en Tiempo Real</h3>
                  <span className="text-sm text-gray-500">
                    Actualizado: {new Date(realtime.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mb-4">
                  <span className="text-2xl font-bold text-hospital-blue">{realtime.activeTickets}</span>
                  <span className="text-gray-600 ml-2">Turnos Activos</span>
                </div>
                {realtime.preadmissionsToday && (
                  <div className="mb-8 p-4 bg-teal-50 border border-teal-100 rounded-lg">
                    <h4 className="font-semibold text-teal-900 mb-2">Preadmisiones de hoy (por llegada)</h4>
                    <p className="text-sm text-teal-800 mb-3">Total: {realtime.preadmissionsToday.total}</p>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(realtime.preadmissionsToday.byArrivalState).map(([key, count]) => (
                        <div key={key} className="px-3 py-1 bg-white rounded border border-teal-200 text-sm">
                          <span className="text-gray-600">{ARRIVAL_LABELS[key] ?? key}:</span>{' '}
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.values(realtime.byService).map((service: any) => (
                    <div key={service.serviceId} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{service.serviceName}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">En Cola:</span>
                          <span className="font-semibold">{service.inQueue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">En Atención:</span>
                          <span className="font-semibold">{service.inService}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hoy:</span>
                          <span className="font-semibold">{service.todayTickets}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'efficiency' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <p className="text-gray-600">Reporte de eficiencia en desarrollo...</p>
              </div>
            )}

            {activeTab === 'preadmissions' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-4 flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                    <select
                      value={preTipo}
                      onChange={(e) => setPreTipo(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg min-w-[140px]"
                    >
                      <option value="">Todas</option>
                      <option value="RAD">Radiología</option>
                      <option value="LAB">Laboratorio</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Documento / nombre</label>
                    <input
                      type="text"
                      value={preDocumento}
                      onChange={(e) => setPreDocumento(e.target.value)}
                      placeholder="Cédula o parte del nombre"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado llegada</label>
                    <select
                      value={preArrivalState}
                      onChange={(e) => setPreArrivalState(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg min-w-[200px]"
                    >
                      <option value="">Todos</option>
                      <option value="registrado">Registrado</option>
                      <option value="espera_llegada">En espera de llegada</option>
                      <option value="paciente_presente">Paciente presente</option>
                      <option value="ticket_generado">Ticket generado</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportPreadmissionsCsv()}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm"
                  >
                    Exportar CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => exportPreadmissionsExcel()}
                    className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm"
                  >
                    Exportar Excel
                  </button>
                </div>

                {loadingPre ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hospital-blue mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando preadmisiones...</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">ID</th>
                          <th className="text-left px-4 py-3 font-semibold">Paciente</th>
                          <th className="text-left px-4 py-3 font-semibold">Cédula</th>
                          <th className="text-left px-4 py-3 font-semibold">Área</th>
                          <th className="text-left px-4 py-3 font-semibold">Estado llegada</th>
                          <th className="text-left px-4 py-3 font-semibold">Estado revisión</th>
                          <th className="text-left px-4 py-3 font-semibold">Ticket</th>
                          <th className="text-left px-4 py-3 font-semibold">Fecha envío</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preadmissions.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                              Sin registros en el rango y filtros seleccionados.
                            </td>
                          </tr>
                        )}
                        {preadmissions.map((row) => (
                          <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-2">{row.id}</td>
                            <td className="px-4 py-2">
                              {row.name1} {row.apellido1}
                            </td>
                            <td className="px-4 py-2 font-mono">{row.cedula}</td>
                            <td className="px-4 py-2">{row.departamento}</td>
                            <td className="px-4 py-2">
                              {ARRIVAL_LABELS[row.arrivalState ?? ''] ?? row.arrivalState ?? '—'}
                            </td>
                            <td className="px-4 py-2">{row.status}</td>
                            <td className="px-4 py-2">{row.ticketId ?? '—'}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {row.fechapreadmision
                                ? new Date(row.fechapreadmision).toLocaleString()
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
        </>
      </div>
    </div>
    </SiteLayout>
  )
}
