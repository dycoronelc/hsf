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

function normalizeHostArea(area: string): 'ADM' | 'LAB' | 'RAD' | null {
  const a = String(area || '').toUpperCase()
  if (a === 'ADM' || a === 'ADMISION') return 'ADM'
  if (a === 'LAB') return 'LAB'
  if (a === 'RAD') return 'RAD'
  return null
}

const AREA_LABELS: Record<'ADM' | 'LAB' | 'RAD', string> = {
  ADM: 'Admisión',
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
    () =>
      services.filter((s) => normalizeHostArea(s.area) !== null),
    [services],
  )

  const groupedServices = useMemo(() => {
    const groups: Record<'ADM' | 'LAB' | 'RAD', Service[]> = { ADM: [], LAB: [], RAD: [] }
    for (const service of receptionServices) {
      const key = normalizeHostArea(service.area)
      if (key) groups[key].push(service)
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
            <h1 className="text-3xl font-bold text-gray-900">Crear turno en recepción</h1>
            <p className="text-gray-600 mt-2">
              Genere turnos de Admisión, Laboratorio o Radiología. Al confirmar, se imprimirá el ticket.
            </p>
          </div>
          <Link href="/dashboard" className="text-hospital-blue hover:underline text-sm font-medium">
            ← Dashboard
          </Link>
        </div>

        <HostNav />

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {(['ADM', 'LAB', 'RAD'] as const).map((area) => {
            const items = groupedServices[area]
            if (!items.length) return null
            return (
              <div key={area}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{AREA_LABELS[area]}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {items.map((service) => {
                    const selected = selectedService === service.id
                    const minutes = service.estimatedTime ?? service.estimated_time
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSelectedService(service.id)}
                        className={`text-left rounded-lg border-2 p-4 transition-colors ${
                          selected
                            ? 'border-hospital-blue bg-hospital-blue/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{service.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{service.code}</div>
                        {minutes != null && (
                          <div className="text-xs text-gray-500 mt-1">Tiempo estimado: {minutes} min</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {receptionServices.length === 0 && (
            <p className="text-sm text-amber-700">
              No hay tipos de ticket activos para Admisión, Laboratorio o Radiología.
            </p>
          )}

          {msg && (
            <div className="text-sm rounded-lg px-3 py-2 bg-gray-50 border border-gray-200 text-gray-800">
              {msg}
            </div>
          )}

          <button
            type="button"
            onClick={createTicket}
            disabled={loading || !selectedService}
            className="w-full bg-hospital-blue text-white py-3 rounded-lg font-semibold hover:bg-hospital-blue-dark disabled:opacity-50"
          >
            {loading ? 'Creando…' : 'Confirmar y imprimir ticket'}
          </button>
        </div>
      </div>

      <TicketPrintOverlay
        ticket={printTicket}
        autoPrint={autoPrint}
        onClose={() => {
          setPrintTicket(null)
          setAutoPrint(false)
        }}
      />
    </SiteLayout>
  )
}
