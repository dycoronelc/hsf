'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../providers'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../components/SiteLayout'
import { LiveQrScannerModal } from '@/app/components/LiveQrScannerModal'
import { canSelectCallDestination, isAgentOperational } from '@/lib/agentState'
import { canAccessStaffConsole } from '@/lib/authRoles'
import { authHeaders, handleAuthFailure } from '@/lib/authToken'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { CALL_DESTINATIONS } from '@/lib/callDestinations'

interface Ticket {
  id: number
  ticket_number: string
  service_id: number
  service_name: string | null
  service_code?: string | null
  status: string
  priority: string
  priority_level?: number
  triage_color?: string | null
  created_at: string
  check_in_at?: string | null
  completed_at?: string | null
  window_number: string | null
  estimated_wait_label?: string
  elapsed_wait_label?: string
  call_count?: number
  called_at?: string | null
  called_by?: number | null
  notes?: string | null
}

type QueueView = 'all' | 'priority' | 'attended'

function isTransferOriginTicket(ticket: Ticket): boolean {
  return Boolean(ticket.notes?.startsWith('Transferido'))
}

/** Triage + Consulta se atienden juntos en destino Triage. */
function isTriageQueueService(service: { code?: string | null; name?: string | null }): boolean {
  const code = (service.code || '').toUpperCase()
  if (code === 'TRIAGE' || code === 'CTA') return true
  return /triage|consulta/i.test(service.name || '')
}

function formatElapsedFromIso(iso?: string | null, now = Date.now()): string {
  if (!iso) return '0h 0m 0s'
  const start = new Date(iso).getTime()
  if (Number.isNaN(start)) return '0h 0m 0s'
  const waitSeconds = Math.max(0, Math.floor((now - start) / 1000))
  const hours = Math.floor(waitSeconds / 3600)
  const minutes = Math.floor((waitSeconds % 3600) / 60)
  const seconds = waitSeconds % 60
  return `${hours}h ${minutes}m ${seconds}s`
}

const DEFAULT_RECALL_WAIT_SECONDS = 60
const DEFAULT_NO_SHOW_WAIT_SECONDS = 60

const TRIAGE_COLOR_OPTIONS = [
  { value: 'rojo', label: 'Rojo', className: 'bg-red-600' },
  { value: 'naranja', label: 'Naranja', className: 'bg-orange-500' },
  { value: 'amarillo', label: 'Amarillo', className: 'bg-yellow-400 text-slate-900' },
  { value: 'verde', label: 'Verde', className: 'bg-green-600' },
  { value: 'azul', label: 'Azul', className: 'bg-blue-600' },
] as const

function isTriageTicket(ticket: { service_code?: string | null; service_name?: string | null }): boolean {
  if (ticket.service_code?.toUpperCase() === 'TRIAGE') return true
  return /triage/i.test(ticket.service_name || '')
}

interface Service {
  id: number
  name: string
  code: string
  area: string
}

export default function StaffConsolePage() {
  const { isAuthenticated, user, token, authHydrated, notifySessionExpired } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [recallWaitSeconds, setRecallWaitSeconds] = useState(DEFAULT_RECALL_WAIT_SECONDS)
  const [noShowWaitSeconds, setNoShowWaitSeconds] = useState(DEFAULT_NO_SHOW_WAIT_SECONDS)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [windowNumber, setWindowNumber] = useState('')
  const [occupiedDestinations, setOccupiedDestinations] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [noShowTarget, setNoShowTarget] = useState<Ticket | null>(null)
  const [noShowReason, setNoShowReason] = useState('')
  const [checkInCode, setCheckInCode] = useState('')
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [checkInMessage, setCheckInMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [agentState, setAgentState] = useState('')
  const [transferringId, setTransferringId] = useState<number | null>(null)
  const [transferNotice, setTransferNotice] = useState('')
  const [queueView, setQueueView] = useState<QueueView>('all')
  const [queueSearch, setQueueSearch] = useState('')
  const [apiError, setApiError] = useState('')
  const scannerContainerId = 'staff-qr-reader'

  const agentStateOptions = [
    { value: 'en_linea', label: 'En línea' },
    { value: 'manual', label: 'Manual' },
    { value: 'fuera_de_linea', label: 'Fuera de línea' },
    { value: 'almuerzo', label: 'Almorzando' },
    { value: 'bano', label: 'Baño' },
    { value: 'documentando', label: 'Documentando' },
  ]

  const triageServiceIds = new Set(
    services.filter((s) => isTriageQueueService(s)).map((s) => s.id),
  )
  const selectedIsTriageGroup =
    selectedService != null && triageServiceIds.has(selectedService)

  const canUseStaff =
    authHydrated && isAuthenticated && user != null && canAccessStaffConsole(user)

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services/')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchOccupiedDestinations = async () => {
    if (!token) return
    try {
      const response = await fetch('/api/tickets/occupied-destinations', {
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        const data = await response.json()
        setOccupiedDestinations(
          Array.isArray(data.destinations)
            ? data.destinations.map((d: string) => String(d).trim()).filter(Boolean)
            : [],
        )
      }
    } catch (error) {
      console.error('Error fetching occupied destinations:', error)
    }
  }

  const fetchTickets = async () => {
    if (!token) return

    try {
      // Triage + Consulta: misma cola operativa → cargar todos y filtrar en cliente
      const url =
        selectedService && !selectedIsTriageGroup
          ? `/api/tickets/?service_id=${selectedService}`
          : '/api/tickets/'
      const response = await fetch(url, { headers: authHeaders(token) })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        let data = await response.json()
        if (selectedIsTriageGroup && Array.isArray(data)) {
          data = data.filter((t: Ticket) => triageServiceIds.has(t.service_id))
        }
        setTickets(data)
        setApiError('')
      } else {
        const data = await response.json().catch(() => ({}))
        setApiError(apiErrorMessage(data, 'No se pudo cargar la cola de turnos'))
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user && !canAccessStaffConsole(user)) {
      router.replace('/dashboard')
      return
    }
    fetchServices()
  }, [authHydrated, isAuthenticated, user, router])

  useEffect(() => {
    if (!canUseStaff || !token) return
    const loadTimings = async () => {
      try {
        const response = await fetch('/api/tickets/call-timings', {
          headers: authHeaders(token),
        })
        if (!response.ok) return
        const data = await response.json()
        if (typeof data.recallWaitSeconds === 'number') {
          setRecallWaitSeconds(data.recallWaitSeconds)
        }
        if (typeof data.noShowWaitSeconds === 'number') {
          setNoShowWaitSeconds(data.noShowWaitSeconds)
        }
      } catch {
        /* keep defaults */
      }
    }
    void loadTimings()
  }, [canUseStaff, token])

  useEffect(() => {
    if (!canUseStaff) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [canUseStaff])

  useEffect(() => {
    if (!canUseStaff || !token) return
    fetchTickets()
    fetchOccupiedDestinations()
    const interval = setInterval(() => {
      fetchTickets()
      fetchOccupiedDestinations()
    }, 3000)
    return () => clearInterval(interval)
  }, [canUseStaff, selectedService, token])

  // Si el agente tenía un turno activo (p. ej. volvió tras expirar sesión), restaurar destino.
  useEffect(() => {
    if (!user?.id || !tickets.length || windowNumber.trim()) return
    const mine = tickets.find(
      (t) =>
        (t.status === 'llamado' || t.status === 'en_atencion') &&
        t.called_by === user.id &&
        (t.window_number || '').trim(),
    )
    if (mine?.window_number) {
      setWindowNumber(mine.window_number.trim())
    }
  }, [tickets, user?.id, windowNumber])

  // Destino se mantiene seleccionado al llamar (solo se limpia si el estado del agente no permite destino).
  // No auto-limpiar por ocupación: el propio ticket del oficial ocupa el destino.

  if (!authHydrated) {
    return (
      <div className="min-h-screen hospital-page-bg flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user || !canAccessStaffConsole(user)) {
    return null
  }

  const handleCallTicket = async (ticketId: number) => {
    if (!agentCanOperate) {
      alert('No puede llamar tickets mientras está en un estado no operativo')
      return
    }
    if (!windowNumber.trim()) {
      alert('Seleccione el destino del llamado')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/call`,
        {
          method: 'POST',
          headers: authHeaders(token, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ windowNumber: windowNumber.trim() }),
        }
      )
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        fetchTickets()
        fetchOccupiedDestinations()
      } else {
        const data = await response.json().catch(() => ({}))
        setApiError(apiErrorMessage(data, 'No se pudo llamar el turno'))
      }
    } catch (error) {
      console.error('Error calling ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTicket = async (ticketId: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/start`, {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ windowNumber: windowNumber.trim() || undefined }),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        fetchTickets()
      } else {
        const data = await response.json().catch(() => ({}))
        setApiError(apiErrorMessage(data, 'No se pudo iniciar la atención'))
      }
    } catch (error) {
      console.error('Error starting ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAgentStateChange = async (newState: string) => {
    setAgentState(newState)
    if (!canSelectCallDestination(newState)) {
      setWindowNumber('')
    }
    try {
      await fetch('/api/auth/agent-state', {
        method: 'PATCH',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ agentState: newState || null }),
      })
    } catch (err) {
      console.error('Error updating agent state:', err)
    }
  }

  const handleTransferTicket = async (
    ticketId: number,
    targetArea: 'RAD' | 'LAB' | 'BOTH' | 'ADM' | 'URG',
  ) => {
    setTransferringId(ticketId)
    setApiError('')
    try {
      const response = await fetch(`/api/tickets/${ticketId}/transfer`, {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ targetArea }),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        const data = await response.json().catch(() => ({}))
        const created = Array.isArray(data.created_tickets)
          ? data.created_tickets.map((t: { ticket_number?: string }) => t.ticket_number).filter(Boolean)
          : []
        if (created.length) {
          setTransferNotice(
            `Transferido (mismo número): ${Array.from(new Set(created)).join(', ')}`,
          )
        } else {
          setTransferNotice(data.message || 'Ticket transferido')
        }
        fetchTickets()
      } else {
        const data = await response.json().catch(() => ({}))
        setApiError(apiErrorMessage(data, 'No se pudo transferir el turno'))
      }
    } catch (err) {
      console.error('Error transferring ticket:', err)
    } finally {
      setTransferringId(null)
    }
  }

  const handleSetTriageColor = async (ticketId: number, triageColor: string) => {
    setLoading(true)
    setApiError('')
    try {
      const response = await fetch(`/api/tickets/${ticketId}/triage-color`, {
        method: 'PATCH',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ triageColor }),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        setTransferNotice(`Color de triage asignado: ${triageColor}`)
        fetchTickets()
      } else {
        const data = await response.json().catch(() => ({}))
        setApiError(apiErrorMessage(data, 'No se pudo asignar el color de triage'))
      }
    } catch (err) {
      console.error('Error setting triage color:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTicket = async (ticketId: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/complete`, {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ windowNumber: windowNumber.trim() || undefined }),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        fetchTickets()
      } else {
        const data = await response.json().catch(() => ({}))
        setApiError(apiErrorMessage(data, 'No se pudo finalizar el turno'))
      }
    } catch (error) {
      console.error('Error completing ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecallTicket = async (ticketId: number) => {
    if (!windowNumber.trim()) {
      alert('Seleccione el destino del llamado')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/recall`, {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ windowNumber: windowNumber.trim() }),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        fetchTickets()
      } else {
        const data = await response.json().catch(() => ({}))
        setApiError(apiErrorMessage(data, 'No se pudo volver a llamar el turno'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleNoShowTicket = async () => {
    if (!noShowTarget || !noShowReason.trim()) return
    setLoading(true)
    try {
      const response = await fetch(`/api/tickets/${noShowTarget.id}/no-show`, {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          reason: noShowReason.trim(),
          windowNumber: windowNumber.trim() || undefined,
        }),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        setNoShowTarget(null)
        setNoShowReason('')
        fetchTickets()
      } else {
        const data = await response.json().catch(() => ({}))
        setApiError(apiErrorMessage(data, 'No se pudo marcar como no se presentó'))
      }
    } finally {
      setLoading(false)
    }
  }

  const canRecallTicket = (ticket: Ticket) => {
    if (ticket.status !== 'llamado') return false
    if ((ticket.call_count ?? 0) < 1) return false
    if (!ticket.called_at) return false
    return nowMs - new Date(ticket.called_at).getTime() >= recallWaitSeconds * 1000
  }

  const canMarkNoShow = (ticket: Ticket) => {
    if (ticket.status !== 'llamado') return false
    // Tras el segundo llamado (y el tiempo configurado) se habilita no presentado
    if ((ticket.call_count ?? 0) < 2) return false
    if (!ticket.called_at) return false
    return nowMs - new Date(ticket.called_at).getTime() >= noShowWaitSeconds * 1000
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      creado: 'bg-gray-100 text-gray-800',
      check_in: 'bg-blue-100 text-blue-800',
      en_cola: 'bg-yellow-100 text-yellow-800',
      llamado: 'bg-orange-100 text-orange-800 border border-orange-300',
      en_atencion: 'bg-purple-100 text-purple-800',
      finalizado: 'bg-green-100 text-green-800',
      transferido: 'bg-indigo-100 text-indigo-800',
      no_show: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      creado: 'Solicitado',
      check_in: 'Arribado',
      en_cola: 'En Cola',
      llamado: 'Llamado',
      en_atencion: 'En Atención',
      finalizado: 'Finalizado',
      transferido: 'Transferido',
      no_show: 'No se presentó',
    }
    return labels[status] || status
  }

  const formatTicketDate = (value?: string | null) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString('es-PA', {
        timeZone: 'America/Panama',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    } catch {
      return value
    }
  }

  const doCheckInByCode = async (code: string) => {
    if (!code.trim()) return false
    setCheckInMessage(null)
    setCheckInLoading(true)
    try {
      const response = await fetch(
        '/api/tickets/check-in-by-code',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.trim() }),
        },
      )
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        if (data.type === 'preadmission') {
          setCheckInMessage({ 
            type: 'success', 
            text: `Llegada registrada: Preadmisión #${data.preadmission_id} - ${data.paciente} (${data.departamento})` 
          })
        } else {
          setCheckInMessage({ type: 'success', text: `Llegada registrada: turno ${data.ticket_number}` })
          fetchTickets()
        }
        setCheckInCode('')
        return true
      } else {
        setCheckInMessage({ type: 'error', text: data.message || 'No se encontró el turno o preadmisión con ese código' })
        return false
      }
    } catch (err) {
      setCheckInMessage({ type: 'error', text: 'Error al registrar llegada' })
      return false
    } finally {
      setCheckInLoading(false)
    }
  }

  const handleCheckInByCode = async () => {
    await doCheckInByCode(checkInCode)
  }

  const agentCanOperate = isAgentOperational(agentState)
  const destinationUnlocked = canSelectCallDestination(agentState)
  const occupiedSet = new Set(occupiedDestinations)
  const myDestination = windowNumber.trim()
  const myOccupiedDestinations = new Set(
    tickets
      .filter(
        (t) =>
          (t.status === 'llamado' || t.status === 'en_atencion') &&
          t.called_by === user?.id &&
          (t.window_number || '').trim(),
      )
      .map((t) => (t.window_number || '').trim()),
  )
  const myResumableTickets = tickets.filter(
    (t) =>
      (t.status === 'llamado' || t.status === 'en_atencion') &&
      t.called_by === user?.id,
  )

  const matchesQueueSearch = (ticket: Ticket) => {
    const q = queueSearch.trim().toLowerCase()
    if (!q) return true
    const haystack = [
      ticket.ticket_number,
      ticket.service_name,
      ticket.service_code,
      ticket.status,
      getStatusLabel(ticket.status),
      ticket.priority,
      ticket.window_number,
      ticket.notes,
      ticket.triage_color,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  }

  const queueTickets = tickets
    .filter((t) => ['creado', 'check_in'].includes(t.status))
    .filter((t) => {
      if (queueView === 'priority') return (t.priority_level ?? 2) <= 2
      return true
    })
    .filter(matchesQueueSearch)
    .sort((a, b) => {
      // Orden de llegada: prioridad de servicio (Triage 1, Consulta 2…), luego llegada
      const levelA = a.priority_level ?? 2
      const levelB = b.priority_level ?? 2
      if (levelA !== levelB) return levelA - levelB
      const arrivalA = new Date(a.check_in_at || a.created_at).getTime()
      const arrivalB = new Date(b.check_in_at || b.created_at).getTime()
      return arrivalA - arrivalB
    })

  const attendedTickets = tickets
    .filter((t) => t.status === 'finalizado')
    .filter(matchesQueueSearch)
    .sort((a, b) => {
      const timeA = new Date(a.completed_at || a.created_at).getTime()
      const timeB = new Date(b.completed_at || b.created_at).getTime()
      return timeB - timeA
    })

  const myActiveTickets = tickets.filter(
    (t) =>
      (t.status === 'llamado' || t.status === 'en_atencion') &&
      myDestination &&
      (t.window_number || '').trim() === myDestination,
  )

  const showWaitingQueue = queueView === 'all' || queueView === 'priority'
  const searchActive = queueSearch.trim().length > 0

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Consola Staff</h1>

          {apiError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {apiError}
            </div>
          )}
          {transferNotice && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
              {transferNotice}
            </div>
          )}

          {/* Check-in al llegar (QR) - Recepción registra que el paciente llegó */}
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Check-in al llegar (QR)</h2>
            <p className="text-sm text-gray-600 mb-3">
              Escanee el QR del paciente (turno o preadmisión) o ingrese el ID / código QR para registrar que llegó al hospital.
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Código o ID de turno</label>
                <input
                  type="text"
                  value={checkInCode}
                  onChange={(e) => setCheckInCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckInByCode()}
                  placeholder="Escanee o escriba el código (turno o preadmisión)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={handleCheckInByCode}
                disabled={checkInLoading || !checkInCode.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkInLoading ? 'Registrando...' : 'Registrar llegada'}
              </button>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 17v-2a2 2 0 00-2-2H7a2 2 0 00-2 2v2" />
                </svg>
                Escanear con cámara
              </button>
            </div>
            {checkInMessage && (
              <p className={`mt-2 text-sm ${checkInMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {checkInMessage.text}
              </p>
            )}
          </div>

          {/* Service Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por servicio
            </label>
            <select
              value={selectedService ?? ''}
              onChange={(e) => {
                const value = e.target.value
                setSelectedService(value ? Number(value) : null)
              }}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todos los servicios</option>
              {services
                .filter((service) => {
                  // Consulta se unifica bajo Triage en la consola
                  const code = (service.code || '').toUpperCase()
                  return code !== 'CTA'
                })
                .map((service) => (
                <option key={service.id} value={service.id}>
                  {(service.code || '').toUpperCase() === 'TRIAGE'
                    ? 'Triage (incluye Consulta)'
                    : `${service.name} (${service.code})`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Por defecto se muestran todos los turnos en cola. Al filtrar Triage también se incluyen turnos de Consulta.
            </p>
          </div>

          {/* Estado del agente (documento Preadmision.md) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado del agente</label>
            <select
              value={agentState}
              onChange={(e) => handleAgentStateChange(e.target.value)}
              className="w-full md:w-56 px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Seleccionar...</option>
              {agentStateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Seleccione En línea, Manual o Fuera de línea para habilitar el destino. Solo En línea y
              Manual permiten llamar turnos.
            </p>
          </div>

          {/* Destino de llamado */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destino del llamado
            </label>
            <select
              value={windowNumber}
              onChange={(e) => setWindowNumber(e.target.value)}
              disabled={!destinationUnlocked}
              className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <option value="">Seleccione un destino</option>
              {CALL_DESTINATIONS.map((dest) => {
                const occupied = occupiedSet.has(dest)
                const keepSelected = windowNumber === dest
                const mine = myOccupiedDestinations.has(dest)
                const disabledOption = occupied && !keepSelected && !mine
                return (
                  <option key={dest} value={dest} disabled={disabledOption}>
                    {disabledOption
                      ? `${dest} (ocupado)`
                      : mine && occupied
                        ? `${dest} (su turno)`
                        : dest}
                  </option>
                )
              })}
            </select>
            {!destinationUnlocked && (
              <p className="text-sm text-amber-700 mt-2">
                Seleccione el estado del agente (En línea, Manual o Fuera de línea) para elegir un
                destino.
              </p>
            )}
            {destinationUnlocked && !windowNumber.trim() && (
              <p className="text-sm text-amber-700 mt-2">
                Seleccione el destino para habilitar <strong>Llamar</strong>.
              </p>
            )}
            {destinationUnlocked && occupiedSet.size > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Los destinos ocupados se liberan al <strong>Finalizar</strong> o marcar{' '}
                <strong>No se presentó</strong>. Si cerró sesión con un turno activo, seleccione
                el destino marcado como <strong>su turno</strong> o pida a un administrador
                liberarlo en <strong>Administración → Liberar destinos</strong>.
              </p>
            )}
            {myResumableTickets.length > 0 && !myDestination && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                Tiene {myResumableTickets.length} turno(s) en curso. Seleccione el destino
                correspondiente para continuar la atención.
              </div>
            )}
            {destinationUnlocked && myDestination && (
              <p className="text-xs text-gray-500 mt-1">
                Solo verá en <strong>Turno Actual</strong> los tickets llamados desde{' '}
                <strong>{myDestination}</strong>.
              </p>
            )}
          </div>

          {/* Current Ticket — solo la ventanilla que lo llamó */}
          {myActiveTickets.length > 0 && (
            <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-xl">
              <h2 className="text-xl font-semibold mb-4">Turno Actual</h2>
              <div className="space-y-4">
                {myActiveTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 bg-white border border-orange-200 rounded-lg shadow-sm"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-2xl font-bold text-gray-900">{ticket.ticket_number}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                          >
                            {getStatusLabel(ticket.status)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>{ticket.service_name}</span>
                          {ticket.window_number && <span>{ticket.window_number}</span>}
                          {ticket.triage_color && (
                            <span className="inline-flex items-center gap-1.5 capitalize">
                              Color asignado:{' '}
                              <span
                                className={`inline-block h-3 w-3 rounded-full ${
                                  TRIAGE_COLOR_OPTIONS.find((c) => c.value === ticket.triage_color)?.className ||
                                  'bg-gray-400'
                                }`}
                              />
                              {TRIAGE_COLOR_OPTIONS.find((c) => c.value === ticket.triage_color)?.label ||
                                ticket.triage_color}
                            </span>
                          )}
                          {(ticket.call_count ?? 0) > 0 && (
                            <span className="text-xs text-gray-500">Llamados: {ticket.call_count}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {ticket.status === 'llamado' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartTicket(ticket.id)}
                              disabled={loading || !agentCanOperate}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                              Iniciar Atención
                            </button>
                            {isTriageTicket(ticket) && (
                              <select
                                value={ticket.triage_color || ''}
                                onChange={(e) => {
                                  const v = e.target.value
                                  if (v) handleSetTriageColor(ticket.id, v)
                                }}
                                disabled={loading || !agentCanOperate}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                              >
                                <option value="">Asignar color…</option>
                                {TRIAGE_COLOR_OPTIONS.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            <select
                              value=""
                              onChange={(e) => {
                                const v = e.target.value
                                if (v) {
                                  handleTransferTicket(
                                    ticket.id,
                                    v as 'RAD' | 'LAB' | 'BOTH' | 'ADM' | 'URG',
                                  )
                                }
                                e.target.value = ''
                              }}
                              disabled={transferringId === ticket.id || !agentCanOperate}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            >
                              <option value="">Transferir…</option>
                              <option value="ADM">Admisión / Ventanilla</option>
                              <option value="URG">Urgencias</option>
                              <option value="RAD">Radiología</option>
                              <option value="LAB">Laboratorio</option>
                              <option value="BOTH">Lab + Rad</option>
                            </select>
                            {canRecallTicket(ticket) && (
                              <button
                                type="button"
                                onClick={() => handleRecallTicket(ticket.id)}
                                disabled={loading || !windowNumber || !agentCanOperate}
                                className="px-4 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50"
                              >
                                Volver a llamar
                              </button>
                            )}
                            {canMarkNoShow(ticket) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNoShowTarget(ticket)
                                  setNoShowReason('')
                                }}
                                disabled={loading || !agentCanOperate}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                              >
                                No se presentó
                              </button>
                            )}
                          </>
                        )}
                        {ticket.status === 'en_atencion' && (
                          <>
                            {isTriageTicket(ticket) && (
                              <select
                                value={ticket.triage_color || ''}
                                onChange={(e) => {
                                  const v = e.target.value
                                  if (v) handleSetTriageColor(ticket.id, v)
                                }}
                                disabled={loading || !agentCanOperate}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                              >
                                <option value="">Asignar color…</option>
                                {TRIAGE_COLOR_OPTIONS.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            <select
                              value=""
                              onChange={(e) => {
                                const v = e.target.value
                                if (v) {
                                  handleTransferTicket(
                                    ticket.id,
                                    v as 'RAD' | 'LAB' | 'BOTH' | 'ADM' | 'URG',
                                  )
                                }
                                e.target.value = ''
                              }}
                              disabled={transferringId === ticket.id || !agentCanOperate}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            >
                              <option value="">Transferir…</option>
                              <option value="ADM">Admisión / Ventanilla</option>
                              <option value="URG">Urgencias</option>
                              <option value="RAD">Radiología</option>
                              <option value="LAB">Laboratorio</option>
                              <option value="BOTH">Lab + Rad</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleCompleteTicket(ticket.id)}
                              disabled={loading}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Finalizar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setQueueView('all')}
              className={`px-4 py-2 rounded-lg text-sm ${queueView === 'all' ? 'bg-hospital-blue text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Todos los tickets
            </button>
            <button
              type="button"
              onClick={() => setQueueView('priority')}
              className={`px-4 py-2 rounded-lg text-sm ${queueView === 'priority' ? 'bg-hospital-blue text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Tickets con prioridades
            </button>
            <button
              type="button"
              onClick={() => setQueueView('attended')}
              className={`px-4 py-2 rounded-lg text-sm ${queueView === 'attended' ? 'bg-hospital-blue text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Atendidos
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label htmlFor="staff-queue-search" className="sr-only">
              Buscar en la cola
            </label>
            <input
              id="staff-queue-search"
              type="search"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Buscar por número, servicio, estado…"
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
            {searchActive && (
              <button
                type="button"
                onClick={() => setQueueSearch('')}
                className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Limpiar
              </button>
            )}
          </div>

          {queueView === 'attended' ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Tickets atendidos</h2>
              <p className="text-sm text-gray-600 mb-4">
                Vista informativa de turnos finalizados. No se pueden llamar desde aquí.
              </p>
              {attendedTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchActive
                    ? 'Ningún ticket atendido coincide con la búsqueda'
                    : 'No hay tickets atendidos'}
                </div>
              ) : (
                <div className="space-y-2">
                  {attendedTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {ticket.ticket_number}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                          {getStatusLabel(ticket.status)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {ticket.service_name}
                        </span>
                        <span className="text-sm text-gray-500">
                          Finalizado: {formatTicketDate(ticket.completed_at || ticket.created_at)}
                        </span>
                        {ticket.window_number && (
                          <span className="text-sm text-gray-500">
                            Destino: {ticket.window_number}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : showWaitingQueue ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Cola de Espera</h2>
            <p className="text-sm text-gray-600 mb-4">
              Ordenada por llegada (Triage antes que Consulta). Incluye tickets transferidos.
            </p>
            {queueTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchActive
                  ? 'Ningún ticket coincide con la búsqueda'
                  : 'No hay pacientes en cola'}
              </div>
            ) : (
              <div className="space-y-2">
                {queueTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {ticket.ticket_number}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {ticket.service_name}
                      </span>
                      <span className="text-sm font-medium text-amber-800">
                        En espera:{' '}
                        {formatElapsedFromIso(ticket.check_in_at || ticket.created_at, nowMs)}
                      </span>
                      {ticket.triage_color && (
                        <span className="inline-flex items-center gap-1.5 text-sm capitalize text-gray-700">
                          Color asignado:
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full border border-black/10 ${
                              TRIAGE_COLOR_OPTIONS.find((c) => c.value === ticket.triage_color)?.className ||
                              'bg-gray-400'
                            }`}
                            aria-hidden
                          />
                          <span className="font-semibold">
                            {TRIAGE_COLOR_OPTIONS.find((c) => c.value === ticket.triage_color)?.label ||
                              ticket.triage_color}
                          </span>
                        </span>
                      )}
                      {isTransferOriginTicket(ticket) && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          Transferido
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCallTicket(ticket.id)}
                        disabled={loading || !windowNumber || !agentCanOperate}
                        className="px-6 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Llamar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : null}
        </div>
      </div>

      {/* Modal escanear QR con cámara (celular o navegador/kiosko) */}
      <LiveQrScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        containerId={scannerContainerId}
        onDecoded={(decodedText) => {
          setShowScanner(false)
          void doCheckInByCode(decodedText)
        }}
        title="Escanear QR con cámara"
        panelClassName="max-w-md"
        description={
          <p>
            Apunte la cámara al QR del paciente (turno o preadmisión). Si abre la cámara equivocada, use el ícono de
            cámaras abajo a la derecha para cambiar.
          </p>
        }
      />
      {noShowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No se presentó</h3>
            <p className="text-sm text-gray-600 mb-4">
              Turno <strong>{noShowTarget.ticket_number}</strong>. Indique el motivo:
            </p>
            <textarea
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Motivo de no presentación"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoShowTarget(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleNoShowTicket()}
                disabled={loading || !noShowReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  )
}
