'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../providers'
import { SiteLayout } from '../../components/SiteLayout'
import { HostNav } from '../../components/HostNav'
import { TicketPrintOverlay, type TicketPrintData } from '../../components/TicketPrintSlip'
import { canAccessHost } from '@/lib/authRoles'
import { authHeaders, handleAuthFailure } from '@/lib/authToken'
import { apiErrorMessage } from '@/lib/apiErrorMessage'

interface Service {
  id: number
  name: string
  code: string
  area: string
  estimated_time?: number | null
  estimatedTime?: number | null
}

const AREA_LABELS: Record<string, string> = {
  LAB: 'Laboratorio',
  RAD: 'Radiología',
}

export default function HostTurnosPage() {
  const { isAuthenticated, token, user, authHydrated, notifySessionExpired } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [printTicket, setPrintTicket] = useState<TicketPrintData | null>(null)
  const [autoPrint, setAutoPrint] = useState(false)

  const receptionServices = useMemo(
    () => services.filter((s) => s.area === 'LAB' || s.area === 'RAD'),
    [services],
  )

  const groupedServices = useMemo(() => {
    const groups: Record<string, Service[]> = { LAB: [], RAD: [] }
    for (const service of receptionServices) {
      groups[service.area]?.push(service)
    }
    return groups
  }, [receptionServices])

  const loadServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services/')
      if (res.ok) {
        setServices(await res.json())
      }
    } catch {
      setMsg('No se pudieron cargar los servicios.')
    }
  }, [])

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!user || !canAccessHost(user.role)) {
      router.replace('/dashboard')
      return
    }
    loadServices()
  }, [authHydrated, isAuthenticated, user, router, loadServices])

  const createTicket = async () => {
    if (!selectedService) {
      setMsg('Seleccione un servicio.')
      return
    }
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/tickets/host', {
        method: 'POST',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceId: selectedService, priority: 'normal' }),
      })
      if (handleAuthFailure(res.status, notifySessionExpired)) return
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setMsg(apiErrorMessage(body, 'No se pudo crear el turno'))
        return
      }
      const data = await res.json()
      setAutoPrint(true)
      setPrintTicket({
        ticketNumber: data.ticket_number,
        serviceName: data.service_name,
        qrCode: data.qr_code,
        queuePosition: data.queue_position,
      })
      setSelectedService(null)
      setMsg(`Turno ${data.ticket_number} creado. Imprimiendo ticket…`)
    } finally {
      setLoading(false)
    }
  }

  if (!authHydrated || !isAuthenticated || !user || !canAccessHost(user.role)) {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Crear turno en recepción</h1>
            <p className="text-gray-600 text-sm mt-1">
              Genere turnos de Laboratorio o Radiología para pacientes sin registro previo. Al confirmar,
              se imprimirá el ticket con número y código QR.
            </p>
          </div>
          <Link href="/dashboard" className="text-hospital-blue font-medium hover:underline text-sm">
            ← Dashboard
          </Link>
        </div>

        <HostNav />

        {msg && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-sm">
            {msg}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {receptionServices.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay servicios de Laboratorio o Radiología activos.</p>
          ) : (
            (['LAB', 'RAD'] as const).map((area) =>
              groupedServices[area].length > 0 ? (
                <div key={area}>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">{AREA_LABELS[area]}</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groupedServices[area].map((service) => {
                      const selected = selectedService === service.id
                      const wait = service.estimated_time ?? service.estimatedTime
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => setSelectedService(service.id)}
                          className={`rounded-lg border-2 p-4 text-left transition-colors ${
                            selected
                              ? 'border-hospital-blue bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-semibold text-gray-900">{service.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{service.code}</p>
                          {wait != null && (
                            <p className="text-xs text-gray-500 mt-1">Tiempo estimado: {wait} min</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null,
            )
          )}

          <button
            type="button"
            onClick={createTicket}
            disabled={loading || !selectedService}
            className="w-full sm:w-auto px-6 py-3 bg-hospital-blue text-white rounded-lg font-semibold hover:bg-hospital-blue-dark disabled:opacity-50"
          >
            {loading ? 'Creando turno…' : 'Confirmar y imprimir ticket'}
          </button>
        </div>
      </div>

      {printTicket && (
        <TicketPrintOverlay
          ticket={printTicket}
          autoPrint={autoPrint}
          onClose={() => {
            setPrintTicket(null)
            setAutoPrint(false)
          }}
        />
      )}
    </SiteLayout>
  )
}
