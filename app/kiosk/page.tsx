'use client'

import { Suspense, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface Service {
  id: number
  name: string
  code: string
  area: string
  estimatedTime: number | null
}

function KioskContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticketCreated, setTicketCreated] = useState(false)
  const [ticketNumber, setTicketNumber] = useState('')
  const [qrCode, setQrCode] = useState('')

  // Obtener sede desde query params si existe
  const sedeId = searchParams.get('sede')

  useEffect(() => {
    fetchServices()
  }, [])

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

    setLoading(true)
    setError('')

    try {
      // Crear ticket como paciente anónimo (sin autenticación)
      // En producción, esto requeriría un endpoint especial o token de kiosco
      const response = await fetch('/api/tickets/kiosk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: selectedService,
          priority: 'normal',
          source: 'kiosk',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al crear turno')
      }

      const ticket = await response.json()
      setTicketNumber(ticket.ticketNumber)
      setQrCode(ticket.qrCode)
      setTicketCreated(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrintTicket = () => {
    window.print()
  }

  if (ticketCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Turno Creado!</h2>
          <div className="bg-gray-50 rounded-lg p-6 my-6">
            <p className="text-sm text-gray-600 mb-2">Tu número de turno es:</p>
            <p className="text-4xl font-bold text-hospital-blue mb-4">{ticketNumber}</p>
            {qrCode && (
              <div className="mb-4">
                <div className="bg-white p-4 rounded inline-block">
                  {/* QR Code placeholder - en producción usar librería QR */}
                  <div className="w-32 h-32 bg-gray-200 rounded mx-auto flex items-center justify-center">
                    <span className="text-xs text-gray-500">QR: {qrCode}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Presenta este código en recepción cuando sea tu turno
            </p>
            <button
              onClick={handlePrintTicket}
              className="w-full bg-hospital-blue text-white py-3 rounded-lg font-semibold hover:bg-hospital-blue-dark"
            >
              Imprimir Ticket
            </button>
            <button
              onClick={() => {
                setTicketCreated(false)
                setSelectedService(null)
                setTicketNumber('')
                setQrCode('')
              }}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50"
            >
              Tomar Otro Turno
            </button>
            <Link
              href="/"
              className="w-full block text-center py-3 text-hospital-blue hover:text-hospital-blue-dark font-semibold hover:underline border border-hospital-blue rounded-lg"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-4">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
            ← Volver al inicio
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center gap-4 items-center mb-4">
              <Image src="/logo-hospital-santa-fe.svg" alt="Hospital Santa Fe" width={180} height={64} className="h-14 w-auto object-contain" />
              <Image src="/logo.png" alt="" width={64} height={64} className="h-16 w-16 object-contain shrink-0" role="presentation" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kiosco Virtual</h1>
            <p className="text-gray-600">Selecciona el servicio para el cual necesitas un turno</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Selecciona un Servicio *
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedService === service.id
                        ? 'border-hospital-blue bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow'
                    }`}
                  >
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">{service.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {service.area} - {service.code}
                    </p>
                    {service.estimatedTime && (
                      <p className="text-sm text-gray-500">
                        ⏱️ Tiempo estimado: {service.estimatedTime} min
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

            <div className="flex justify-center mt-8">
              <button
                onClick={handleCreateTicket}
                disabled={!selectedService || loading}
                className="px-8 py-4 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
              >
                {loading ? 'Creando Turno...' : 'Crear Turno'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KioskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>}>
      <KioskContent />
    </Suspense>
  )
}
