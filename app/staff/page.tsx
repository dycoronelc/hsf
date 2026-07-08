'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../providers'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../components/SiteLayout'
import { LiveQrScannerModal } from '@/app/components/LiveQrScannerModal'
import { isAgentOperational } from '@/lib/agentState'
import { canAccessStaffConsole } from '@/lib/authRoles'
import { authHeaders, handleAuthFailure } from '@/lib/authToken'
import { apiErrorMessage } from '@/lib/apiErrorMessage'

interface Ticket {
  id: number
  ticket_number: string
  service_id: number
  service_name: string | null
  status: string
  priority: string
  priority_level?: number
  created_at: string
  window_number: string | null
  estimated_wait_label?: string
}

interface PreadmissionQueueItem {
  id: number
  name1: string
  apellido1: string
  cedula: string
  departamento: string
  arrivalState: string
  fechapreadmision: string
  ticketId?: number | null
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
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [preadmissions, setPreadmissions] = useState<PreadmissionQueueItem[]>([])
  const [windowNumber, setWindowNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkInCode, setCheckInCode] = useState('')
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [checkInMessage, setCheckInMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [agentState, setAgentState] = useState<string>(user?.agentState ?? '')
  const [transferringId, setTransferringId] = useState<number | null>(null)
  const [queueView, setQueueView] = useState<'all' | 'priority'>('all')
  const [apiError, setApiError] = useState('')
  const scannerContainerId = 'staff-qr-reader'

  const ARRIVAL_LABELS: Record<string, string> = {
    registrado: 'Registrado',
    espera_llegada: 'En espera de llegada',
    paciente_presente: 'Paciente presente',
    ticket_generado: 'Ticket generado',
  }

  const agentStateOptions = [
    { value: 'en_linea', label: 'En línea' },
    { value: 'manual', label: 'Manual' },
    { value: 'fuera_de_linea', label: 'Fuera de línea' },
    { value: 'almuerzo', label: 'Almorzando' },
    { value: 'bano', label: 'Baño' },
    { value: 'documentando', label: 'Documentando' },
  ]

  const canUseStaff =
    authHydrated && isAuthenticated && user != null && canAccessStaffConsole(user.role)

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

  const selectedServiceArea = selectedService
    ? services.find((s) => s.id === selectedService)?.area
    : null

  const fetchTickets = async () => {
    if (!token) return

    try {
      const url = selectedService
        ? `/api/tickets/?service_id=${selectedService}`
        : '/api/tickets/'
      const response = await fetch(url, { headers: authHeaders(token) })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        const data = await response.json()
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

  const fetchPreadmissions = async () => {
    if (!token) return

    try {
      const params = new URLSearchParams()
      if (selectedServiceArea === 'LAB' || selectedServiceArea === 'RAD') {
        params.set('departamento', selectedServiceArea)
      }
      const qs = params.toString()
      const response = await fetch(
        `/api/preadmission/staff-queue${qs ? `?${qs}` : ''}`,
        { headers: authHeaders(token) },
      )
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        setPreadmissions(await response.json())
      }
    } catch (error) {
      console.error('Error fetching preadmissions queue:', error)
    }
  }

  const fetchQueueData = async () => {
    await Promise.all([fetchTickets(), fetchPreadmissions()])
  }

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user && !canAccessStaffConsole(user.role)) {
      router.replace('/dashboard')
      return
    }
    fetchServices()
  }, [authHydrated, isAuthenticated, user, router])

  useEffect(() => {
    if (!canUseStaff) return
    if (user?.agentState) setAgentState(user.agentState)
  }, [canUseStaff, user?.agentState])

  useEffect(() => {
    if (!canUseStaff || !token) return
    fetchQueueData()
    const interval = setInterval(fetchQueueData, 3000)
    return () => clearInterval(interval)
  }, [canUseStaff, selectedService, selectedServiceArea, token])

  if (!authHydrated) {
    return (
      <div className="min-h-screen hospital-page-bg flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user || !canAccessStaffConsole(user.role)) {
    return null
  }

  const handleCallTicket = async (ticketId: number) => {
    if (!agentCanOperate) {
      alert('No puede llamar tickets mientras está en un estado no operativo')
      return
    }
    if (!windowNumber) {
      alert('Por favor ingresa un número de ventanilla')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/call`,
        {
          method: 'POST',
          headers: authHeaders(token, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ windowNumber }),
        }
      )
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        fetchQueueData()
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
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        fetchQueueData()
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

  const handleTransferTicket = async (ticketId: number, targetArea: 'RAD' | 'LAB' | 'BOTH') => {
    setTransferringId(ticketId)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/transfer`, {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ targetArea }),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        fetchQueueData()
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

  const handleCompleteTicket = async (ticketId: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/complete`, {
        method: 'POST',
        headers: authHeaders(token),
      })
      if (handleAuthFailure(response.status, notifySessionExpired)) return
      if (response.ok) {
        fetchQueueData()
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      creado: 'bg-gray-100 text-gray-800',
      check_in: 'bg-blue-100 text-blue-800',
      en_cola: 'bg-yellow-100 text-yellow-800',
      llamado: 'bg-orange-100 text-orange-800',
      en_atencion: 'bg-purple-100 text-purple-800',
      finalizado: 'bg-green-100 text-green-800',
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
    }
    return labels[status] || status
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
          fetchQueueData()
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

  const queueTickets = tickets
    .filter((t) => ['creado', 'check_in', 'en_cola'].includes(t.status))
    .filter((t) => (queueView === 'priority' ? (t.priority_level ?? 2) <= 2 : true))
    .sort((a, b) => {
      const levelA = a.priority_level ?? 2
      const levelB = b.priority_level ?? 2
      if (levelA !== levelB) return levelA - levelB
      if (a.priority !== b.priority) {
        const priorityOrder = ['emergencia', 'cita', 'adulto_mayor', 'embarazo', 'discapacidad', 'normal']
        return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Consola Operativa</h1>

          {apiError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {apiError}
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
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Por defecto se muestran todos los turnos y preadmisiones en cola de espera.
            </p>
          </div>

          {/* Estado del agente (documento Preadmision.md) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado del agente</label>
            <select
              value={agentState}
              onChange={(e) => handleAgentStateChange(e.target.value)}
              className="w-full md:w-56 px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Seleccionar...</option>
              {agentStateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">En estados no operativos no se asignan tickets ni llamados.</p>
          </div>

          {/* Window Number */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Ventanilla/Consultorio
            </label>
            <input
              type="text"
              value={windowNumber}
              onChange={(e) => setWindowNumber(e.target.value)}
              placeholder="Ej: V1, C2"
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Current Ticket */}
          {tickets.find(t => t.status === 'llamado' || t.status === 'en_atencion') && (
            <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Turno Actual</h2>
              {tickets
                .filter(t => t.status === 'llamado' || t.status === 'en_atencion')
                .map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold">{ticket.ticket_number}</span>
                      {ticket.window_number && (
                        <span className="ml-4 text-gray-600">Ventanilla: {ticket.window_number}</span>
                      )}
                    </div>
                    <div className="space-x-2">
                      {ticket.status === 'llamado' && (
                        <button
                          onClick={() => handleStartTicket(ticket.id)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          Iniciar Atención
                        </button>
                      )}
                      {ticket.status === 'en_atencion' && (
                        <button
                          onClick={() => handleCompleteTicket(ticket.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Finalizar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
          </div>

          {/* Queue */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Cola de Espera</h2>
            {queueTickets.length === 0 && preadmissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay pacientes en cola
              </div>
            ) : (
              <div className="space-y-2">
                {preadmissions.map((pre) => (
                  <div
                    key={`pre-${pre.id}`}
                    className="flex items-center justify-between p-4 bg-teal-50 rounded-lg border border-teal-100"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-sm font-semibold text-teal-800 uppercase tracking-wide">
                        Preadmisión #{pre.id}
                      </span>
                      <span className="font-medium text-gray-900">
                        {pre.name1} {pre.apellido1}
                      </span>
                      <span className="text-sm text-gray-600 font-mono">{pre.cedula}</span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                        {ARRIVAL_LABELS[pre.arrivalState] ?? pre.arrivalState}
                      </span>
                      <span className="text-sm text-gray-600">
                        {pre.departamento === 'LAB' ? 'Laboratorio' : pre.departamento === 'RAD' ? 'Radiología' : pre.departamento}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {pre.arrivalState === 'ticket_generado'
                        ? pre.ticketId
                          ? `Ticket #${pre.ticketId}`
                          : 'Ticket de admisión generado'
                        : 'Preadmisión en espera'}
                    </span>
                  </div>
                ))}
                {queueTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl font-bold text-gray-900">
                        {ticket.ticket_number}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {ticket.service_name}
                      </span>
                      {ticket.estimated_wait_label && (
                        <span className="text-sm text-gray-500">
                          Espera estimada: {ticket.estimated_wait_label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value=""
                        onChange={(e) => {
                          const v = e.target.value
                          if (v) handleTransferTicket(ticket.id, v as 'RAD' | 'LAB' | 'BOTH')
                          e.target.value = ''
                        }}
                        disabled={transferringId === ticket.id || !agentCanOperate}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Transferir...</option>
                        <option value="RAD">Radiología</option>
                        <option value="LAB">Laboratorio</option>
                        <option value="BOTH">Ambos</option>
                      </select>
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
    </SiteLayout>
  )
}
