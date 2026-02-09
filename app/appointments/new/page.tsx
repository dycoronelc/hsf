'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../providers'
import Link from 'next/link'
import { formatDateInput, ddMmYyyyToIso, isValidDdMmYyyy } from '@/lib/dateUtils'

interface Service {
  id: number
  name: string
  code: string
  area: string
  estimatedTime: number | null
  requiresAppointment: boolean
}

export default function NewAppointmentPage() {
  const { isAuthenticated, token } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchServices()
  }, [isAuthenticated])

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchAvailableSlots()
    } else {
      setAvailableSlots([])
    }
  }, [selectedService, selectedDate])

  const fetchServices = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/services/`)
      if (response.ok) {
        const data = await response.json()
        // Filtrar solo servicios que requieren cita
        const appointmentServices = data.filter((s: Service) => s.requiresAppointment)
        setServices(appointmentServices)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchAvailableSlots = async () => {
    if (!selectedService || !selectedDate) return
    const dateIso = ddMmYyyyToIso(selectedDate)
    if (!dateIso || !isValidDdMmYyyy(selectedDate)) return

    setLoadingSlots(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/available-slots?serviceId=${selectedService}&date=${dateIso}`,
      )
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (error) {
      console.error('Error fetching available slots:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleCreateAppointment = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      setError('Por favor completa todos los campos requeridos')
      return
    }
    const dateIso = ddMmYyyyToIso(selectedDate)
    if (!dateIso || !isValidDdMmYyyy(selectedDate)) {
      setError('La fecha debe estar en formato DD/MM/YYYY y ser válida')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/appointments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: selectedService,
          scheduledDate: dateIso,
          scheduledTime: selectedTime,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Error al crear cita')
      }

      const appointment = await response.json()
      router.push(`/appointments?created=${appointment.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium">
            ← Volver al inicio
          </Link>
          <span className="text-gray-400">|</span>
          <Link href="/appointments" className="text-gray-600 hover:text-gray-900 hover:underline text-sm font-medium">
            ← Mis Citas
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Agendar Nueva Cita</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Selección de Servicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona un Servicio *
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service.id)
                      setSelectedDate('')
                      setSelectedTime('')
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedService === service.id
                        ? 'border-hospital-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {service.area} - {service.code}
                    </p>
                    {service.estimatedTime && (
                      <p className="text-sm text-gray-500 mt-1">
                        Duración: {service.estimatedTime} min
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {services.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay servicios disponibles que requieran cita previa
                </div>
              )}
            </div>

            {/* Selección de Fecha (DD/MM/YYYY) */}
            {selectedService && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona una Fecha * (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(formatDateInput(e.target.value))
                    setSelectedTime('')
                  }}
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
                  required
                />
              </div>
            )}

            {/* Selección de Hora */}
            {selectedService && selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona una Hora *
                </label>
                {loadingSlots ? (
                  <div className="text-center py-4 text-gray-500">Cargando horarios disponibles...</div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`px-4 py-2 border-2 rounded-lg transition-all ${
                          selectedTime === slot
                            ? 'border-hospital-blue bg-blue-50 text-hospital-blue font-semibold'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-red-500">
                    No hay horarios disponibles para esta fecha. Por favor selecciona otra fecha.
                  </div>
                )}
              </div>
            )}

            {/* Notas */}
            {selectedService && selectedDate && selectedTime && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
                  placeholder="Información adicional sobre tu cita..."
                />
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Link
                href="/appointments"
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                onClick={handleCreateAppointment}
                disabled={!selectedService || !selectedDate || !selectedTime || loading}
                className="px-6 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando Cita...' : 'Confirmar Cita'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
