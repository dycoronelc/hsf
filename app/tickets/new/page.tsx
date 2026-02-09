'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../providers'
import Link from 'next/link'

interface Service {
  id: number
  name: string
  code: string
  area: string
  estimated_time: number | null
}

export default function NewTicketPage() {
  const { isAuthenticated, token } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchServices()
  }, [isAuthenticated])

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

  const handleCreateTicket = async () => {
    if (!selectedService) {
      setError('Por favor selecciona un servicio')
      return
    }

    const authToken = token ?? localStorage.getItem('token')
    if (!authToken) {
      setError('Sesión expirada. Por favor inicia sesión de nuevo.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tickets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          serviceId: selectedService,
          priority: 'normal',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al crear turno')
      }

      const ticket = await response.json()
      router.push(`/tickets?created=${ticket.ticket_number}&pos=${ticket.queue_position}&ahead=${ticket.ahead_count}`)
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
          <Link href="/tickets" className="text-gray-600 hover:text-gray-900 hover:underline text-sm font-medium">
            ← Mis Turnos
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Tomar Turno</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona un Servicio *
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
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
                    {service.estimated_time && (
                      <p className="text-sm text-gray-500 mt-1">
                        Tiempo estimado: {service.estimated_time} min
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {services.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay servicios disponibles
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Link
                href="/tickets"
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                onClick={handleCreateTicket}
                disabled={!selectedService || loading}
                className="px-6 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Turno'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
