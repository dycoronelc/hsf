'use client'

import Link from 'next/link'
import { formatDateToDdMmYyyy } from '@/lib/dateUtils'

interface Appointment {
  id: number
  serviceId: number
  serviceName?: string
  scheduledDate: string
  scheduledTime?: string
  status: string
  notes?: string
  createdAt: string
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'Programada',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
  }
  return map[status] ?? status
}

interface AppointmentsListProps {
  appointments: Appointment[]
  onCancel: (id: number) => void
  loading: boolean
  showCreatedSuccess: boolean
}

export function AppointmentsList({ appointments, onCancel, loading, showCreatedSuccess }: AppointmentsListProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-4">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
            ← Volver al inicio
          </Link>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Citas</h1>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium">
              Inicio
            </Link>
            <Link
              href="/appointments/new"
              className="bg-hospital-blue text-white px-6 py-2 rounded-lg hover:bg-hospital-blue-dark"
            >
              + Nueva Cita
            </Link>
          </div>
        </div>

        {showCreatedSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            ¡Cita creada exitosamente!
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando citas...</div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 text-xl mb-4">No tienes citas programadas</p>
            <Link
              href="/appointments/new"
              className="text-hospital-blue hover:underline font-medium"
            >
              Agendar una cita →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {appointments.map((apt) => {
              const scheduledDate = new Date(apt.scheduledDate)
              const dateStr = formatDateToDdMmYyyy(apt.scheduledDate)
              const timeStr = apt.scheduledTime || scheduledDate.toLocaleTimeString('es-PA', {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div key={apt.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {apt.serviceName || `Cita #${apt.id}`}
                      </h3>
                      <p className="text-sm text-gray-500">ID: {apt.id}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(apt.status)}`}>
                      {getStatusText(apt.status)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  {apt.notes && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        <strong>Notas:</strong> {apt.notes}
                      </p>
                    </div>
                  )}

                  {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                    <button
                      onClick={() => onCancel(apt.id)}
                      className="w-full mt-4 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                    >
                      Cancelar Cita
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
