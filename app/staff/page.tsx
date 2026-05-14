'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../providers'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../components/SiteLayout'
import type { Html5Qrcode } from 'html5-qrcode'
import { startLiveQrScanner } from '@/lib/html5QrcodeScan'
import { isAgentOperational } from '@/lib/agentState'

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

interface Service {
  id: number
  name: string
  code: string
  area: string
}

export default function StaffConsolePage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [windowNumber, setWindowNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkInCode, setCheckInCode] = useState('')
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [checkInMessage, setCheckInMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [agentState, setAgentState] = useState<string>(user?.agentState ?? '')
  const [transferringId, setTransferringId] = useState<number | null>(null)
  const [queueView, setQueueView] = useState<'all' | 'priority'>('all')
  const qrScannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = 'staff-qr-reader'

  const agentStateOptions = [
    { value: 'en_linea', label: 'En línea' },
    { value: 'manual', label: 'Manual' },
    { value: 'fuera_de_linea', label: 'Fuera de línea' },
    { value: 'almuerzo', label: 'Almorzando' },
    { value: 'bano', label: 'Baño' },
    { value: 'documentando', label: 'Documentando' },
  ]

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (user?.role === 'patient') {
      router.push('/dashboard')
      return
    }
    fetchServices()
  }, [authHydrated, isAuthenticated, user, router])

  if (!authHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    )
  }
  if (!isAuthenticated || user?.role === 'patient') {
    return null
  }

  useEffect(() => {
    if (user?.agentState) setAgentState(user.agentState)
  }, [user?.agentState])

  useEffect(() => {
    if (selectedService) {
      fetchTickets()
      const interval = setInterval(fetchTickets, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedService])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services/')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
        if (data.length > 0 && !selectedService) {
          setSelectedService(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchTickets = async () => {
    if (!selectedService || !token) return
    
    try {
      const response = await fetch(
        `/api/tickets/?service_id=${selectedService}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ window_number: windowNumber }),
        }
      )
      if (response.ok) {
        fetchTickets()
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
      const response = await fetch(
        `/api/tickets/${ticketId}/start`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )
      if (response.ok) {
        fetchTickets()
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetArea }),
      })
      if (response.ok) {
        fetchTickets()
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
      const response = await fetch(
        `/api/tickets/${ticketId}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )
      if (response.ok) {
        fetchTickets()
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
          if (selectedService) fetchTickets()
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

  useEffect(() => {
    if (!showScanner) return
    setScanError(null)
    setScanning(true)
    let cancelled = false
    const startScanner = async () => {
      try {
        const scanner = await startLiveQrScanner(
          scannerContainerId,
          (decodedText) => {
            if (cancelled) return
            void scanner
              .stop()
              .then(() => {
                try {
                  scanner.clear()
                } catch {
                  /* */
                }
              })
              .then(() => {
                qrScannerRef.current = null
                if (!cancelled) {
                  setShowScanner(false)
                  setScanning(false)
                  void doCheckInByCode(decodedText)
                }
              })
              .catch(() => {})
          },
          () => {},
        )
        if (cancelled) {
          try {
            await scanner.stop()
          } catch {
            /* */
          }
          try {
            scanner.clear()
          } catch {
            /* */
          }
          return
        }
        qrScannerRef.current = scanner
        setScanning(false)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
        setScanError(msg)
        setScanning(false)
        qrScannerRef.current = null
      }
    }
    const timer = setTimeout(startScanner, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
      const scanner = qrScannerRef.current
      if (scanner) {
        qrScannerRef.current = null
        scanner.stop().catch(() => {})
        try {
          scanner.clear()
        } catch {
          /* */
        }
      }
    }
  }, [showScanner])

  const closeScanner = async () => {
    const scanner = qrScannerRef.current
    qrScannerRef.current = null
    if (scanner) {
      try {
        await scanner.stop()
      } catch {
        // ignorar si ya está detenido o el DOM fue removido
      }
      try {
        scanner.clear()
      } catch {
        /* */
      }
    }
    setShowScanner(false)
    setScanError(null)
    setScanning(false)
  }

  const agentCanOperate = isAgentOperational(agentState)

  const queueTickets = tickets
    .filter((t) => ['check_in', 'en_cola'].includes(t.status))
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
              Seleccionar Servicio
            </label>
            <select
              value={selectedService || ''}
              onChange={(e) => setSelectedService(Number(e.target.value))}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Seleccione...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.code})
                </option>
              ))}
            </select>
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
            {queueTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay pacientes en cola
              </div>
            ) : (
              <div className="space-y-2">
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
      {showScanner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Escanear QR con cámara</h3>
            <p className="text-sm text-gray-600 mb-4">
              Apunte la cámara del celular o del navegador (kiosko) al QR del paciente (turno o preadmisión). Se usará la cámara trasera en móviles si está disponible.
            </p>
            <div id={scannerContainerId} className="min-h-[280px] sm:min-h-[400px] w-full rounded-lg overflow-hidden bg-gray-100" />
            {scanError && (
              <p className="mt-3 text-sm text-red-600">{scanError}</p>
            )}
            {scanning && !scanError && (
              <p className="mt-2 text-sm text-gray-500">Iniciando cámara...</p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => closeScanner()}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  )
}
