'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '../providers'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../components/SiteLayout'
import { formatDateInput, ddMmYyyyToIso, isValidDdMmYyyy } from '@/lib/dateUtils'
import { canAccessReports, canExportReports } from '@/lib/authRoles'
import { authHeaders, handleAuthFailure } from '@/lib/authToken'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { formatPreadmissionDate } from '@/lib/preadmissionLabels'
import { CALL_DESTINATIONS } from '@/lib/callDestinations'
import { ReportsDashboard } from './ReportsDashboard'

interface SummaryReport {
  period: { start: string; end: string; label?: string }
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
  management?: {
    period_label: string
    by_service: Array<{
      service_id: number
      service_name: string
      service_code: string
      ticket_prefix: string | null
      tickets_issued: number
      tickets_attended: number
      no_show_percent: number
      avg_wait_label: string
      avg_attention_label: string
      sla_objective_minutes: number
      sla_objective_label: string
      sla_met_percent: number
      sla_wait_minutes?: number
      sla_attention_minutes?: number
    }>
    totals: {
      tickets_issued: number
      tickets_attended: number
      no_show_percent: number
      avg_wait_label: string
      avg_attention_label: string
      sla_met_percent: number
    }
    ticket_details: Array<{
      id: number
      date: string
      service_id: number
      service_name: string
      ticket_number: string
      entry_time: string
      start_time: string
      exit_time: string
      wait_label: string
      attention_label: string
      status: string
      status_label: string
      sla_attention_minutes: number
      sla_wait_minutes?: number
      meets_sla_label: string
    }>
    daily_attention?: {
      services: Array<{
        service_id: number
        service_name: string
        service_code: string
      }>
      rows: Array<{
        date: string
        values: Record<string, { minutes: number | null; label: string }>
        day_average_minutes: number | null
        day_average_label: string
      }>
      overall_average_minutes: number
      overall_average_label: string
    }
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

interface EfficiencyReport {
  period: { start: string; end: string }
  totalTickets: number
  kpis?: {
    tickets_generated: number
    tickets_attended: number
    no_shows: number
    transferred: number
    avg_wait_minutes: number
    avg_wait_label: string
    max_wait_minutes: number
    max_wait_label: string
    avg_attention_minutes: number
    avg_attention_label: string
    sla_met_percent: number
    sla_wait_met_percent: number
    sla_attention_eligible: number
    sla_attention_met: number
  }
  byWindow: Record<
    string,
    {
      windowNumber: string
      totalTickets: number
      averageServiceTime: number
      totalServiceTime: number
    }
  >
  byAgent?: Record<
    string,
    {
      agentId: number | null
      agentName: string
      totalTickets: number
      averageServiceTime: number
    }
  >
  byHour: Record<string, number>
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

interface ServiceOption {
  id: number
  name: string
  code: string
  area: string
  ticketPrefix?: string | null
}

interface AgentOption {
  id: number
  fullName: string | null
  email: string
  role: string
}

const ARRIVAL_LABELS: Record<string, string> = {
  registrado: 'Registrado',
  espera_llegada: 'En espera de llegada',
  paciente_presente: 'Paciente presente',
  ticket_generado: 'Ticket generado',
}

function serviceLabel(s: ServiceOption): string {
  const prefix = (s.ticketPrefix || s.code || '').toUpperCase()
  return `${prefix} — ${s.name}`
}

const SERVICE_ROW_COLORS = [
  'bg-emerald-100',
  'bg-orange-100',
  'bg-yellow-100',
  'bg-sky-100',
  'bg-fuchsia-100',
  'bg-lime-100',
  'bg-amber-100',
  'bg-cyan-100',
  'bg-rose-100',
  'bg-indigo-100',
]

function serviceColorClass(serviceId: number): string {
  return SERVICE_ROW_COLORS[Math.abs(serviceId) % SERVICE_ROW_COLORS.length]
}

function slaHeatClass(pct: number): string {
  if (pct < 50) return 'bg-red-500 text-white font-semibold'
  if (pct < 60) return 'bg-orange-400 text-white font-semibold'
  if (pct < 70) return 'bg-yellow-300 text-slate-900 font-semibold'
  return 'bg-green-500 text-white font-semibold'
}

export default function ReportsPage() {
  const { isAuthenticated, token, user, authHydrated, notifySessionExpired } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'summary' | 'daily' | 'realtime' | 'efficiency' | 'preadmissions' | 'sla'
  >('dashboard')
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [realtime, setRealtime] = useState<RealTimeReport | null>(null)
  const [efficiency, setEfficiency] = useState<EfficiencyReport | null>(null)
  const [preadmissions, setPreadmissions] = useState<PreadmissionRow[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [slaRows, setSlaRows] = useState<
    Array<{
      service_id: number
      service_name: string
      service_code: string
      sla_wait_minutes: number
      sla_attention_minutes: number
    }>
  >([])
  const [loading, setLoading] = useState(false)
  const [loadingPre, setLoadingPre] = useState(false)
  const [loadingEff, setLoadingEff] = useState(false)
  const [loadingSla, setLoadingSla] = useState(false)
  const [savingSla, setSavingSla] = useState(false)
  const [slaMessage, setSlaMessage] = useState('')
  const [slaError, setSlaError] = useState('')

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [windowNumber, setWindowNumber] = useState('')
  const [agentId, setAgentId] = useState('')
  const [applied, setApplied] = useState({
    startDate: '',
    endDate: '',
    serviceId: '',
    windowNumber: '',
    agentId: '',
    preDocumento: '',
    preArrivalState: '',
  })

  const [preDocumento, setPreDocumento] = useState('')
  const [preArrivalState, setPreArrivalState] = useState('')
  const [exporting, setExporting] = useState(false)

  const appendSharedParams = useCallback(
    (params: URLSearchParams, opts?: { includeDates?: boolean }) => {
      const includeDates = opts?.includeDates !== false
      if (includeDates) {
        const startIso =
          applied.startDate && isValidDdMmYyyy(applied.startDate)
            ? ddMmYyyyToIso(applied.startDate)
            : ''
        const endIso =
          applied.endDate && isValidDdMmYyyy(applied.endDate) ? ddMmYyyyToIso(applied.endDate) : ''
        if (startIso) params.append('startDate', startIso)
        if (endIso) params.append('endDate', endIso)
      }
      if (applied.serviceId) params.append('serviceId', applied.serviceId)
      if (applied.windowNumber) params.append('windowNumber', applied.windowNumber)
      if (applied.agentId) params.append('agentId', applied.agentId)
    },
    [applied],
  )

  const loadServicesAndAgents = useCallback(async () => {
    if (!token) return
    try {
      const [svcRes, agentsRes] = await Promise.all([
        fetch('/api/services/'),
        fetch('/api/reports/agents', { headers: authHeaders(token) }),
      ])
      if (handleAuthFailure(agentsRes.status, notifySessionExpired)) return
      if (svcRes.ok) {
        const data = await svcRes.json()
        setServices(Array.isArray(data) ? data : [])
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading filter catalogs:', error)
    }
  }, [token, notifySessionExpired])

  const loadSummary = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      appendSharedParams(params)
      const response = await fetch(`/api/reports/summary?${params.toString()}`, {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        setSummary(await response.json())
      }
    } catch (error) {
      console.error('Error loading summary:', error)
    } finally {
      setLoading(false)
    }
  }, [token, appendSharedParams, notifySessionExpired])

  const loadRealTime = useCallback(async () => {
    if (!token) return
    try {
      const params = new URLSearchParams()
      appendSharedParams(params, { includeDates: false })
      const response = await fetch(`/api/reports/realtime?${params.toString()}`, {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        setRealtime(await response.json())
      }
    } catch (error) {
      console.error('Error loading realtime:', error)
    }
  }, [token, appendSharedParams, notifySessionExpired])

  const loadEfficiency = useCallback(async () => {
    if (!token) return
    setLoadingEff(true)
    try {
      const params = new URLSearchParams()
      appendSharedParams(params)
      const response = await fetch(`/api/reports/efficiency?${params.toString()}`, {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        setEfficiency(await response.json())
      }
    } catch (error) {
      console.error('Error loading efficiency:', error)
    } finally {
      setLoadingEff(false)
    }
  }, [token, appendSharedParams, notifySessionExpired])

  const loadSlaParameters = useCallback(async () => {
    if (!token) return
    setLoadingSla(true)
    setSlaError('')
    try {
      const response = await fetch('/api/reports/sla-parameters', {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (!response.ok) throw new Error('No se pudieron cargar los parámetros SLA')
      const data = await response.json()
      setSlaRows(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setSlaError(err instanceof Error ? err.message : 'Error al cargar SLA')
    } finally {
      setLoadingSla(false)
    }
  }, [token, notifySessionExpired])

  const saveSlaParameters = async () => {
    if (!token) return
    setSavingSla(true)
    setSlaMessage('')
    setSlaError('')
    try {
      for (const row of slaRows) {
        if (row.sla_wait_minutes < 1 || row.sla_attention_minutes < 1) {
          setSlaError('Todos los minutos de SLA deben ser al menos 1.')
          setSavingSla(false)
          return
        }
      }
      const response = await fetch('/api/reports/sla-parameters', {
        method: 'PUT',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: slaRows.map((r) => ({
            serviceId: r.service_id,
            slaWaitMinutes: Number(r.sla_wait_minutes),
            slaAttentionMinutes: Number(r.sla_attention_minutes),
          })),
        }),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSlaError(apiErrorMessage(data, 'No se pudieron guardar los parámetros SLA'))
        return
      }
      setSlaMessage(`Parámetros SLA guardados (${data.updated ?? slaRows.length} servicios).`)
      await loadSlaParameters()
    } catch {
      setSlaError('Error al guardar los parámetros SLA')
    } finally {
      setSavingSla(false)
    }
  }

  const resolvePreadTipoFromService = useCallback(
    (sid: string): string => {
      if (!sid) return ''
      const svc = services.find((s) => String(s.id) === sid)
      const area = String(svc?.area || svc?.code || '').toUpperCase()
      if (area === 'RAD' || area === 'LAB') return area
      return ''
    },
    [services],
  )

  const loadPreadmissions = useCallback(async () => {
    if (!token) return
    setLoadingPre(true)
    try {
      if (applied.serviceId) {
        const tipoFromService = resolvePreadTipoFromService(applied.serviceId)
        if (!tipoFromService) {
          setPreadmissions([])
          setLoadingPre(false)
          return
        }
      }
      if (applied.windowNumber || applied.agentId) {
        setPreadmissions([])
        setLoadingPre(false)
        return
      }

      const params = new URLSearchParams()
      appendSharedParams(params)
      const tipo = resolvePreadTipoFromService(applied.serviceId)
      if (tipo === 'RAD' || tipo === 'LAB') params.append('tipo', tipo)
      if (applied.preDocumento.trim()) params.append('documento', applied.preDocumento.trim())
      if (applied.preArrivalState) params.append('arrivalState', applied.preArrivalState)

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
  }, [
    token,
    appendSharedParams,
    applied.serviceId,
    applied.windowNumber,
    applied.agentId,
    applied.preDocumento,
    applied.preArrivalState,
    resolvePreadTipoFromService,
    notifySessionExpired,
  ])

  const exportFullExcel = async () => {
    if (!token) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      appendSharedParams(params)
      const tipo = resolvePreadTipoFromService(applied.serviceId)
      if (tipo === 'RAD' || tipo === 'LAB') params.append('tipo', tipo)
      if (applied.preDocumento.trim()) params.append('documento', applied.preDocumento.trim())
      if (applied.preArrivalState) params.append('arrivalState', applied.preArrivalState)

      const response = await fetch(`/api/reports/export?${params.toString()}`, {
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
      if (!response.ok) {
        alert('No se pudo generar el Excel de reportes')
        return
      }
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `reportes_hsf_${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      console.error('Export Excel failed:', e)
      alert('Error al exportar Excel')
    } finally {
      setExporting(false)
    }
  }

  const applyFilters = () => {
    if (startDate && !isValidDdMmYyyy(startDate)) {
      alert('Fecha de inicio inválida. Use DD/MM/YYYY.')
      return
    }
    if (endDate && !isValidDdMmYyyy(endDate)) {
      alert('Fecha de fin inválida. Use DD/MM/YYYY.')
      return
    }
    setApplied({
      startDate,
      endDate,
      serviceId,
      windowNumber,
      agentId,
      preDocumento,
      preArrivalState,
    })
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setServiceId('')
    setWindowNumber('')
    setAgentId('')
    setPreDocumento('')
    setPreArrivalState('')
    setApplied({
      startDate: '',
      endDate: '',
      serviceId: '',
      windowNumber: '',
      agentId: '',
      preDocumento: '',
      preArrivalState: '',
    })
  }

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!canAccessReports(user)) {
      router.replace('/dashboard')
      return
    }
    void loadServicesAndAgents()
  }, [authHydrated, isAuthenticated, user, router, loadServicesAndAgents])

  useEffect(() => {
    if (!authHydrated || !isAuthenticated || !canAccessReports(user) || !token) return
    if (activeTab === 'dashboard') {
      void loadSummary()
      void loadEfficiency()
    } else if (activeTab === 'summary' || activeTab === 'daily') {
      void loadSummary()
    } else if (activeTab === 'realtime') {
      void loadRealTime()
    } else if (activeTab === 'efficiency') {
      void loadEfficiency()
    } else if (activeTab === 'preadmissions') {
      void loadPreadmissions()
    } else if (activeTab === 'sla') {
      void loadSlaParameters()
    }
  }, [
    authHydrated,
    isAuthenticated,
    user,
    activeTab,
    applied,
    token,
    loadSummary,
    loadRealTime,
    loadEfficiency,
    loadPreadmissions,
    loadSlaParameters,
  ])

  useEffect(() => {
    if (!authHydrated || !isAuthenticated || !canAccessReports(user) || !token) return
    if (activeTab !== 'realtime') return
    const interval = setInterval(() => void loadRealTime(), 30000)
    return () => clearInterval(interval)
  }, [authHydrated, isAuthenticated, user, token, activeTab, loadRealTime])

  if (!authHydrated || !isAuthenticated || !canAccessReports(user)) {
    return null
  }

  const efficiencyWindows = efficiency
    ? Object.values(efficiency.byWindow).sort((a, b) => b.totalTickets - a.totalTickets)
    : []
  const efficiencyAgents = efficiency?.byAgent
    ? Object.values(efficiency.byAgent).sort((a, b) => b.totalTickets - a.totalTickets)
    : []
  const efficiencyHours = efficiency
    ? Object.entries(efficiency.byHour)
        .map(([hour, count]) => ({ hour: Number(hour), count: Number(count) }))
        .sort((a, b) => a.hour - b.hour)
    : []

  return (
    <SiteLayout>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1"
            >
              ← Volver al dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Reportes y Analítica</h1>

          {/* Filtros compartidos (encima de pestañas) */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
              <p className="text-xs text-gray-500">
                Pulse <strong>Aplicar</strong> para actualizar todos los reportes. Las fechas usan el
                día completo en zona Panamá.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha inicio (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(formatDateInput(e.target.value))}
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                  className="px-4 py-2 border border-gray-300 rounded-lg w-40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha fin (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={endDate}
                  onChange={(e) => setEndDate(formatDateInput(e.target.value))}
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                  className="px-4 py-2 border border-gray-300 rounded-lg w-40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área / Servicio
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg min-w-[220px]"
                >
                  <option value="">Todos</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {serviceLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ventanilla destino
                </label>
                <select
                  value={windowNumber}
                  onChange={(e) => setWindowNumber(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg min-w-[180px]"
                >
                  <option value="">Todas</option>
                  {CALL_DESTINATIONS.map((dest) => (
                    <option key={dest} value={dest}>
                      {dest}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agente / oficial
                </label>
                <select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg min-w-[220px]"
                >
                  <option value="">Todos</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName || a.email}
                    </option>
                  ))}
                </select>
              </div>
              {activeTab === 'preadmissions' && (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Documento / nombre
                    </label>
                    <input
                      type="text"
                      value={preDocumento}
                      onChange={(e) => setPreDocumento(e.target.value)}
                      placeholder="Cédula o parte del nombre"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado llegada
                    </label>
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
                </>
              )}
              <button
                type="button"
                onClick={applyFilters}
                className="px-5 py-2 bg-hospital-blue text-white rounded-lg hover:opacity-90 text-sm font-medium"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm"
              >
                Limpiar
              </button>
              {canExportReports(user) && (
                <button
                  type="button"
                  onClick={() => void exportFullExcel()}
                  disabled={exporting}
                  className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm disabled:opacity-50"
                >
                  {exporting ? 'Generando…' : 'Exportar Excel'}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Exportar Excel genera un archivo .xlsx con varias hojas (Dashboard, Resumen, Detalle,
              Diario, Eficiencia, SLA, Preadmisiones) según los filtros aplicados.
            </p>
            {(applied.windowNumber || applied.agentId) && activeTab === 'preadmissions' && (
              <p className="text-xs text-amber-700 mt-2">
                Ventanilla y agente aplican a reportes de turnos. En Preadmisiones solo se usan
                fechas, área/servicio (RAD/LAB), documento y estado de llegada.
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-lg mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px overflow-x-auto">
                {(
                  [
                    ['dashboard', 'Dashboard'],
                    ['summary', 'Resumen'],
                    ['daily', 'Resumen Diario'],
                    ['realtime', 'Tiempo Real'],
                    ['efficiency', 'Eficiencia'],
                    ['preadmissions', 'Preadmisiones'],
                    ['sla', 'Parámetros SLA'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === key
                        ? 'border-hospital-blue text-hospital-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <>
            {activeTab === 'dashboard' && (
              <ReportsDashboard
                summary={summary}
                efficiency={efficiency}
                loading={loading || loadingEff}
              />
            )}

            {activeTab === 'summary' && loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hospital-blue mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando reportes...</p>
              </div>
            )}
            {activeTab === 'summary' && !loading && summary && (
              <div className="space-y-8">
                {/* Cuadro consolidado por área / servicio */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                  <div className="bg-[#1e3a5f] px-4 py-3">
                    <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                      Cuadro general de gestión de atenciones — Resumen consolidado por área /
                      servicio
                    </h3>
                  </div>
                  <p className="px-4 py-2 text-sm italic text-gray-500 border-b border-gray-100">
                    Período:{' '}
                    {summary.management?.period_label ||
                      summary.period.label ||
                      'Últimos 30 días'}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-center">
                      <thead>
                        <tr className="bg-[#2c5282] text-white">
                          <th className="px-3 py-2 text-left font-semibold">Área / Servicio</th>
                          <th className="px-3 py-2 font-semibold">Tickets Emitidos</th>
                          <th className="px-3 py-2 font-semibold">Tickets Atendidos</th>
                          <th className="px-3 py-2 font-semibold">% No Presentados</th>
                          <th className="px-3 py-2 font-semibold">T. Espera Prom.</th>
                          <th className="px-3 py-2 font-semibold">T. Atención Prom.</th>
                          <th className="px-3 py-2 font-semibold">SLA Espera Objetivo</th>
                          <th className="px-3 py-2 font-semibold">SLA Cumplido (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(summary.management?.by_service || []).map((row) => (
                          <tr key={row.service_id} className="border-b border-gray-200">
                            <td
                              className={`px-3 py-2 text-left font-medium text-gray-900 ${serviceColorClass(row.service_id)}`}
                            >
                              {row.service_name}
                            </td>
                            <td className="px-3 py-2">{row.tickets_issued}</td>
                            <td className="px-3 py-2">{row.tickets_attended}</td>
                            <td className="px-3 py-2">{row.no_show_percent.toFixed(1)}%</td>
                            <td className="px-3 py-2">{row.avg_wait_label || '0:00'}</td>
                            <td className="px-3 py-2">{row.avg_attention_label || '0:00'}</td>
                            <td className="px-3 py-2">{row.sla_objective_label}</td>
                            <td className={`px-3 py-2 ${slaHeatClass(row.sla_met_percent)}`}>
                              {row.sla_met_percent.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                        {summary.management?.totals && (
                          <tr className="bg-slate-200 font-bold border-t-2 border-slate-400">
                            <td className="px-3 py-2 text-left uppercase">
                              Total / Promedio general
                            </td>
                            <td className="px-3 py-2">{summary.management.totals.tickets_issued}</td>
                            <td className="px-3 py-2">
                              {summary.management.totals.tickets_attended}
                            </td>
                            <td className="px-3 py-2">
                              {summary.management.totals.no_show_percent.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2">
                              {summary.management.totals.avg_wait_label || '0:00'}
                            </td>
                            <td className="px-3 py-2">
                              {summary.management.totals.avg_attention_label || '0:00'}
                            </td>
                            <td className="px-3 py-2">—</td>
                            <td className="px-3 py-2 bg-slate-400 text-white">
                              {summary.management.totals.sla_met_percent.toFixed(1)}%
                            </td>
                          </tr>
                        )}
                        {(summary.management?.by_service || []).length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-gray-500">
                              Sin tickets en el período y filtros seleccionados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Detalle individual (fuente del consolidado) */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                  <div className="bg-[#1e3a5f] px-4 py-3">
                    <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                      Detalle de control de tickets por área / servicio
                    </h3>
                  </div>
                  <p className="px-4 py-2 text-sm italic text-gray-500 border-b border-gray-100">
                    Registro individual de cada ticket: hora de entrada, inicio de atención y
                    salida
                  </p>
                  <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                    <table className="min-w-full text-xs sm:text-sm text-center">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#2c5282] text-white">
                          <th className="px-2 py-2 font-semibold">Fecha</th>
                          <th className="px-2 py-2 text-left font-semibold">Área / Servicio</th>
                          <th className="px-2 py-2 font-semibold">N° Ticket</th>
                          <th className="px-2 py-2 font-semibold">Hora Entrada</th>
                          <th className="px-2 py-2 font-semibold">Hora Inicio Atención</th>
                          <th className="px-2 py-2 font-semibold">Hora Salida</th>
                          <th className="px-2 py-2 font-semibold">T. Espera (ventanilla)</th>
                          <th className="px-2 py-2 font-semibold">T. Atención</th>
                          <th className="px-2 py-2 font-semibold">Estado</th>
                          <th className="px-2 py-2 font-semibold">SLA Atención Objetivo (min)</th>
                          <th className="px-2 py-2 font-semibold">Cumple SLA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(summary.management?.ticket_details || []).map((row) => (
                          <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-2 py-1.5 whitespace-nowrap">{row.date}</td>
                            <td
                              className={`px-2 py-1.5 text-left font-medium ${serviceColorClass(row.service_id)}`}
                            >
                              {row.service_name}
                            </td>
                            <td
                              className={`px-2 py-1.5 font-mono font-semibold ${serviceColorClass(row.service_id)}`}
                            >
                              {row.ticket_number}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{row.entry_time || '—'}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{row.start_time || '—'}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{row.exit_time || '—'}</td>
                            <td className="px-2 py-1.5">{row.wait_label || '—'}</td>
                            <td className="px-2 py-1.5">{row.attention_label || '—'}</td>
                            <td className="px-2 py-1.5">{row.status_label}</td>
                            <td className="px-2 py-1.5">{row.sla_attention_minutes}</td>
                            <td className="px-2 py-1.5 font-medium">{row.meets_sla_label || ''}</td>
                          </tr>
                        ))}
                        {(summary.management?.ticket_details || []).length === 0 && (
                          <tr>
                            <td colSpan={11} className="px-4 py-8 text-gray-500">
                              Sin detalle de tickets en el período y filtros seleccionados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'daily' && loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hospital-blue mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando resumen diario...</p>
              </div>
            )}
            {activeTab === 'daily' && !loading && summary && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <div className="bg-[#1e3a5f] px-4 py-3">
                  <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                    Cuadro general de atenciones — Tiempo promedio de atención por día
                  </h3>
                </div>
                <p className="px-4 py-2 text-sm italic text-gray-500 border-b border-gray-100">
                  Tiempos promedio de atención (hh:mm) por área / servicio y fecha
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-center">
                    <thead>
                      <tr className="bg-[#2c5282] text-white">
                        <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                        {(summary.management?.daily_attention?.services || []).map((svc) => (
                          <th key={svc.service_id} className="px-3 py-2 font-semibold">
                            {svc.service_name}
                          </th>
                        ))}
                        <th className="px-3 py-2 font-semibold">Promedio total general</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary.management?.daily_attention?.rows || []).map((row) => (
                        <tr key={row.date} className="border-b border-gray-200">
                          <td className="px-3 py-2 text-left whitespace-nowrap font-medium">
                            {row.date}
                          </td>
                          {(summary.management?.daily_attention?.services || []).map((svc) => {
                            const cell = row.values[String(svc.service_id)]
                            return (
                              <td key={svc.service_id} className="px-3 py-2">
                                {cell?.label || ''}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 font-bold">
                            {row.day_average_label || ''}
                          </td>
                        </tr>
                      ))}
                      {(summary.management?.daily_attention?.rows || []).length > 0 && (
                        <tr className="bg-sky-100 font-bold border-t-2 border-sky-300">
                          <td
                            className="px-3 py-2 text-left uppercase"
                            colSpan={
                              1 +
                              (summary.management?.daily_attention?.services || []).length
                            }
                          >
                            Promedio total de atención general
                          </td>
                          <td className="px-3 py-2">
                            {summary.management?.daily_attention?.overall_average_label || '0:00'}
                          </td>
                        </tr>
                      )}
                      {(summary.management?.daily_attention?.rows || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={
                              2 + (summary.management?.daily_attention?.services || []).length
                            }
                            className="px-4 py-8 text-gray-500"
                          >
                            Sin tickets atendidos en el período y filtros seleccionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="px-4 py-3 text-xs italic text-gray-500 border-t border-gray-100">
                  Nota: celdas en blanco indican que no hubo tickets atendidos de ese servicio en la
                  fecha. Cálculo automático desde el detalle de tickets.
                </p>
              </div>
            )}

            {activeTab === 'sla' && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <div className="bg-[#1e3a5f] px-4 py-3">
                  <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                    Parámetros de SLA por área / servicio
                  </h3>
                </div>
                <p className="px-4 py-2 text-sm italic text-gray-500 border-b border-gray-100">
                  Editar estos valores (minutos) para ajustar los cálculos de cumplimiento en todos
                  los reportes.
                </p>
                {slaError && (
                  <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                    {slaError}
                  </div>
                )}
                {slaMessage && (
                  <div className="mx-4 mt-3 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded text-sm">
                    {slaMessage}
                  </div>
                )}
                {loadingSla ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hospital-blue mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando parámetros...</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-[#2c5282] text-white">
                            <th className="px-3 py-2 text-left font-semibold">Área / Servicio</th>
                            <th className="px-3 py-2 text-center font-semibold">
                              SLA Espera Objetivo (min)
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                              SLA Atención Objetivo (min)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {slaRows.map((row) => (
                            <tr key={row.service_id} className="border-b border-gray-200">
                              <td
                                className={`px-3 py-2 font-medium text-[#1e3a5f] ${serviceColorClass(row.service_id)}`}
                              >
                                {row.service_name}
                              </td>
                              <td className="px-3 py-2 text-center bg-yellow-50">
                                <input
                                  type="number"
                                  min={1}
                                  max={480}
                                  value={row.sla_wait_minutes}
                                  onChange={(e) => {
                                    const value = Number(e.target.value)
                                    setSlaRows((prev) =>
                                      prev.map((r) =>
                                        r.service_id === row.service_id
                                          ? { ...r, sla_wait_minutes: value }
                                          : r,
                                      ),
                                    )
                                  }}
                                  className="w-24 px-2 py-1 border border-yellow-200 rounded text-center text-[#1e3a5f] font-semibold bg-yellow-50"
                                />
                              </td>
                              <td className="px-3 py-2 text-center bg-yellow-50">
                                <input
                                  type="number"
                                  min={1}
                                  max={480}
                                  value={row.sla_attention_minutes}
                                  onChange={(e) => {
                                    const value = Number(e.target.value)
                                    setSlaRows((prev) =>
                                      prev.map((r) =>
                                        r.service_id === row.service_id
                                          ? { ...r, sla_attention_minutes: value }
                                          : r,
                                      ),
                                    )
                                  }}
                                  className="w-24 px-2 py-1 border border-yellow-200 rounded text-center text-[#1e3a5f] font-semibold bg-yellow-50"
                                />
                              </td>
                            </tr>
                          ))}
                          {slaRows.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                No hay servicios activos configurados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-4 border-t border-gray-100 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void saveSlaParameters()}
                        disabled={savingSla || slaRows.length === 0}
                        className="px-5 py-2 bg-hospital-blue text-white rounded-lg hover:opacity-90 text-sm font-medium disabled:opacity-50"
                      >
                        {savingSla ? 'Guardando…' : 'Guardar parámetros SLA'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void loadSlaParameters()}
                        disabled={loadingSla || savingSla}
                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        Recargar
                      </button>
                    </div>
                  </>
                )}
              </div>
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
                  <span className="text-2xl font-bold text-hospital-blue">
                    {realtime.activeTickets}
                  </span>
                  <span className="text-gray-600 ml-2">Turnos Activos</span>
                </div>
                {realtime.preadmissionsToday && (
                  <div className="mb-8 p-4 bg-teal-50 border border-teal-100 rounded-lg">
                    <h4 className="font-semibold text-teal-900 mb-2">
                      Preadmisiones de hoy (por llegada)
                    </h4>
                    <p className="text-sm text-teal-800 mb-3">
                      Total: {realtime.preadmissionsToday.total}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(realtime.preadmissionsToday.byArrivalState).map(
                        ([key, count]) => (
                          <div
                            key={key}
                            className="px-3 py-1 bg-white rounded border border-teal-200 text-sm"
                          >
                            <span className="text-gray-600">{ARRIVAL_LABELS[key] ?? key}:</span>{' '}
                            <span className="font-semibold">{count}</span>
                          </div>
                        ),
                      )}
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
              <div className="space-y-6">
                {loadingEff ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hospital-blue mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando eficiencia...</p>
                  </div>
                ) : efficiency ? (
                  <>
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                      <div className="bg-[#1e3a5f] px-4 py-3">
                        <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                          Eficiencia operativa — KPIs
                        </h3>
                      </div>
                      <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="border border-gray-100 rounded-lg p-4 bg-slate-50">
                          <p className="text-sm text-gray-600">Total de tickets generados</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {efficiency.kpis?.tickets_generated ?? efficiency.totalTickets}
                          </p>
                        </div>
                        <div className="border border-gray-100 rounded-lg p-4 bg-green-50">
                          <p className="text-sm text-gray-600">Total de tickets atendidos</p>
                          <p className="text-3xl font-bold text-green-800">
                            {efficiency.kpis?.tickets_attended ?? 0}
                          </p>
                        </div>
                        <div className="border border-gray-100 rounded-lg p-4 bg-red-50">
                          <p className="text-sm text-gray-600">No presentados</p>
                          <p className="text-3xl font-bold text-red-700">
                            {efficiency.kpis?.no_shows ?? 0}
                          </p>
                        </div>
                        <div className="border border-gray-100 rounded-lg p-4 bg-amber-50">
                          <p className="text-sm text-gray-600">Transferidos</p>
                          <p className="text-3xl font-bold text-amber-800">
                            {efficiency.kpis?.transferred ?? 0}
                          </p>
                        </div>
                      </div>
                      <div className="px-4 pb-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Métricas de tiempo</h4>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="border border-gray-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Tiempo de espera promedio</p>
                            <p className="text-2xl font-bold text-[#1e3a5f]">
                              {efficiency.kpis?.avg_wait_label || '0:00'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Emisión → llamado (llamados, transferidos y finalizados)
                            </p>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Tiempo máximo de espera</p>
                            <p className="text-2xl font-bold text-[#1e3a5f]">
                              {efficiency.kpis?.max_wait_label || '0:00'}
                            </p>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Tiempo promedio de atención</p>
                            <p className="text-2xl font-bold text-[#1e3a5f]">
                              {efficiency.kpis?.avg_attention_label || '0:00'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Finalización − inicio de atención
                            </p>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600">
                              % atendidos dentro de SLA (atención)
                            </p>
                            <p
                              className={`text-2xl font-bold inline-block px-2 py-1 rounded ${slaHeatClass(efficiency.kpis?.sla_met_percent ?? 0)}`}
                            >
                              {(efficiency.kpis?.sla_met_percent ?? 0).toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {efficiency.kpis?.sla_attention_met ?? 0} de{' '}
                              {efficiency.kpis?.sla_attention_eligible ?? 0} atendidos · SLA
                              espera: {(efficiency.kpis?.sla_wait_met_percent ?? 0).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Desglose operativo</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-800 mb-3">Por ventanilla destino</h4>
                          {efficiencyWindows.length === 0 ? (
                            <p className="text-sm text-gray-500">Sin datos en el período.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="border-b text-left text-gray-600">
                                    <th className="py-2 pr-3">Destino</th>
                                    <th className="py-2 pr-3">Turnos</th>
                                    <th className="py-2">Tiempo prom. (min)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {efficiencyWindows.map((row) => (
                                    <tr key={row.windowNumber} className="border-b border-gray-100">
                                      <td className="py-2 pr-3">{row.windowNumber}</td>
                                      <td className="py-2 pr-3 font-medium">{row.totalTickets}</td>
                                      <td className="py-2">
                                        {Number(row.averageServiceTime || 0).toFixed(1)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800 mb-3">Por agente / oficial</h4>
                          {efficiencyAgents.length === 0 ? (
                            <p className="text-sm text-gray-500">Sin datos en el período.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="border-b text-left text-gray-600">
                                    <th className="py-2 pr-3">Agente</th>
                                    <th className="py-2 pr-3">Turnos</th>
                                    <th className="py-2">Tiempo prom. (min)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {efficiencyAgents.map((row) => (
                                    <tr
                                      key={String(row.agentId ?? row.agentName)}
                                      className="border-b border-gray-100"
                                    >
                                      <td className="py-2 pr-3">{row.agentName}</td>
                                      <td className="py-2 pr-3 font-medium">{row.totalTickets}</td>
                                      <td className="py-2">
                                        {Number(row.averageServiceTime || 0).toFixed(1)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h4 className="font-medium text-gray-800 mb-3">Volumen por hora (Panamá)</h4>
                      {efficiencyHours.length === 0 ? (
                        <p className="text-sm text-gray-500">Sin datos en el período.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {efficiencyHours.map((row) => (
                            <div
                              key={row.hour}
                              className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-center"
                            >
                              <p className="text-xs text-gray-500">
                                {String(row.hour).padStart(2, '0')}:00
                              </p>
                              <p className="text-lg font-semibold text-gray-900">{row.count}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow-lg p-6 text-gray-600">
                    No se pudo cargar el reporte de eficiencia.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'preadmissions' && (
              <div className="space-y-6">
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
                                ? formatPreadmissionDate(row.fechapreadmision)
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
