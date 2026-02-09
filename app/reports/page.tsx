'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../providers'
import { useRouter } from 'next/navigation'
import { formatDateInput, ddMmYyyyToIso } from '@/lib/dateUtils'

interface SummaryReport {
  period: { start: string; end: string }
  tickets: {
    total: number
    completed: number
    noShows: number
    averageWaitTime: number
    averageServiceTime: number
  }
  appointments: {
    total: number
    completed: number
    cancelled: number
    completionRate: number
  }
  satisfaction: {
    totalSurveys: number
    averageNPS: number
    averageCSAT: number
    responseRate: number
  }
}

interface RealTimeReport {
  timestamp: string
  activeTickets: number
  byService: { [key: string]: any }
}

export default function ReportsPage() {
  const { isAuthenticated, token } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'summary' | 'realtime' | 'efficiency'>('summary')
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [realtime, setRealtime] = useState<RealTimeReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    loadSummary()
    loadRealTime()
    // Actualizar tiempo real cada 30 segundos
    const interval = setInterval(loadRealTime, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  useEffect(() => {
    if (activeTab === 'summary') {
      loadSummary()
    } else if (activeTab === 'realtime') {
      loadRealTime()
    }
  }, [activeTab, startDate, endDate])

  const loadSummary = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const startIso = startDate ? ddMmYyyyToIso(startDate) : ''
      const endIso = endDate ? ddMmYyyyToIso(endDate) : ''
      if (startIso) params.append('startDate', startIso)
      if (endIso) params.append('endDate', endIso)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/summary?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Error loading summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRealTime = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/realtime`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setRealtime(data)
      }
    } catch (error) {
      console.error('Error loading realtime:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-4">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
            ← Volver al inicio
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Reportes y Analítica</h1>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'summary'
                    ? 'border-hospital-blue text-hospital-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('realtime')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'realtime'
                    ? 'border-hospital-blue text-hospital-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tiempo Real
              </button>
              <button
                onClick={() => setActiveTab('efficiency')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'efficiency'
                    ? 'border-hospital-blue text-hospital-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Eficiencia
              </button>
            </nav>
          </div>
        </div>

        {/* Filtros de fecha */}
        {activeTab === 'summary' && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6 flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio (DD/MM/YYYY)</label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(formatDateInput(e.target.value))}
                placeholder="dd/mm/yyyy"
                maxLength={10}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin (DD/MM/YYYY)</label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(formatDateInput(e.target.value))}
                placeholder="dd/mm/yyyy"
                maxLength={10}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Contenido de tabs */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hospital-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando reportes...</p>
          </div>
        ) : (
          <>
            {activeTab === 'summary' && summary && (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Turnos</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold">{summary.tickets.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completados:</span>
                      <span className="font-semibold text-green-600">{summary.tickets.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">No Shows:</span>
                      <span className="font-semibold text-red-600">{summary.tickets.noShows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiempo Espera Promedio:</span>
                      <span className="font-semibold">{summary.tickets.averageWaitTime.toFixed(1)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiempo Atención Promedio:</span>
                      <span className="font-semibold">{summary.tickets.averageServiceTime.toFixed(1)} min</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Citas</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold">{summary.appointments.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completadas:</span>
                      <span className="font-semibold text-green-600">{summary.appointments.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Canceladas:</span>
                      <span className="font-semibold text-red-600">{summary.appointments.cancelled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasa de Completación:</span>
                      <span className="font-semibold">{summary.appointments.completionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Satisfacción</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Encuestas Recibidas:</span>
                      <span className="font-semibold">{summary.satisfaction.totalSurveys}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">NPS Promedio:</span>
                      <span className="font-semibold">{summary.satisfaction.averageNPS}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CSAT Promedio:</span>
                      <span className="font-semibold">{summary.satisfaction.averageCSAT}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasa de Respuesta:</span>
                      <span className="font-semibold">{summary.satisfaction.responseRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'realtime' && realtime && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Estado en Tiempo Real</h3>
                  <span className="text-sm text-gray-500">
                    Actualizado: {new Date(realtime.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mb-4">
                  <span className="text-2xl font-bold text-hospital-blue">{realtime.activeTickets}</span>
                  <span className="text-gray-600 ml-2">Turnos Activos</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.values(realtime.byService).map((service: any) => (
                    <div key={service.serviceId} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{service.serviceName}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">En Cola:</span>
                          <span className="font-semibold">{service.inQueue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">En Atención:</span>
                          <span className="font-semibold">{service.inService}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hoy:</span>
                          <span className="font-semibold">{service.todayTickets}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'efficiency' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <p className="text-gray-600">Reporte de eficiencia en desarrollo...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
