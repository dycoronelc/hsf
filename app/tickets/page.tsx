'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../providers'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { formatDateToDdMmYyyy } from '@/lib/dateUtils'

interface Ticket {
  id: number
  ticket_number: string
  service_id: number
  service_name: string | null
  status: string
  priority: string
  created_at: string
  qr_code: string | null
  queue_position?: number
  ahead_count?: number
}

export default function TicketsPage() {
  const { isAuthenticated, token } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchTickets()
    }
  }, [isAuthenticated, token])

  const fetchTickets = async () => {
    const authToken = token ?? localStorage.getItem('token')
    if (!authToken) return
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
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
      no_show: 'bg-red-100 text-red-800',
      cancelado: 'bg-gray-100 text-gray-800',
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
      no_show: 'No Show',
      cancelado: 'Cancelado',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-4">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
            ← Volver al inicio
          </Link>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Turnos</h1>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium">
              Inicio
            </Link>
            <Link
              href="/tickets/new"
              className="bg-hospital-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-hospital-blue-dark"
            >
              Tomar Nuevo Turno
            </Link>
          </div>
        </div>

        {/* Aviso al crear turno */}
        {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('created') && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            Turno creado: <strong>{new URLSearchParams(window.location.search).get('created')}</strong>
            {new URLSearchParams(window.location.search).get('pos') && (
              <>
                {' '}· Número asignado: <strong>{new URLSearchParams(window.location.search).get('pos')}</strong>
              </>
            )}
            {new URLSearchParams(window.location.search).get('ahead') && (
              <>
                {' '}· Pacientes por delante: <strong>{new URLSearchParams(window.location.search).get('ahead')}</strong>
              </>
            )}
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 text-xl mb-4">No tienes turnos registrados</p>
            <Link
              href="/tickets/new"
              className="text-hospital-blue hover:underline font-medium"
            >
              Tomar tu primer turno →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{ticket.ticket_number}</h3>
                    <p className="text-gray-600">{ticket.service_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>
                
                {ticket.qr_code && (
                  <div className="mt-4 flex flex-col items-center">
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <QRCodeSVG value={String(ticket.id)} size={120} level="M" />
                    </div>
                    <div className="mt-2 text-center text-sm text-gray-700">
                      <div><strong>Servicio:</strong> {ticket.service_name || '-'}</div>
                      {ticket.status === 'check_in' ? (
                        <div className="mt-1 text-green-700 font-semibold">Arribado (ya registrado)</div>
                      ) : (
                        <>
                          <div><strong>Número asignado:</strong> {ticket.queue_position ?? '-'}</div>
                          <div><strong>Por delante:</strong> {ticket.ahead_count ?? '-'}</div>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Presente al llegar al hospital</p>
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-500">
                  Creado: {formatDateToDdMmYyyy(ticket.created_at)} {new Date(ticket.created_at).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal for ticket details */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Detalles del Turno</h2>
              <div className="space-y-4">
                <div>
                  <strong>Número:</strong> {selectedTicket.ticket_number}
                </div>
                <div>
                  <strong>Servicio:</strong> {selectedTicket.service_name}
                </div>
                <div>
                  <strong>Número asignado:</strong> {selectedTicket.queue_position ?? '-'}
                </div>
                <div>
                  <strong>Pacientes por delante:</strong> {selectedTicket.ahead_count ?? '-'}
                </div>
                <div>
                  <strong>Estado:</strong> {getStatusLabel(selectedTicket.status)}
                </div>
                {selectedTicket.qr_code && (
                  <div className="flex flex-col items-center mt-4">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <QRCodeSVG value={String(selectedTicket.id)} size={180} level="M" />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Presente este QR al llegar al hospital para registrar su llegada</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="mt-6 w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
