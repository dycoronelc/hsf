'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateToDdMmYyyy } from '@/lib/dateUtils'

interface QueueItem {
  ticket_number: string
  service_name: string
  priority: string
  wait_time: number | null
  status: string
}

interface MonitorData {
  service_id: number
  service_name: string
  current: QueueItem | null
  queue: QueueItem[]
  next_numbers: string[]
}

interface PreadmissionItem {
  id: number
  cedula: string
  nombre: string
  status: string
  fechapreadmision: string
}

interface PreadmissionDept {
  departamento: string
  label: string
  items: PreadmissionItem[]
}

export default function MonitorPage() {
  const [queues, setQueues] = useState<MonitorData[]>([])
  const [preadmissions, setPreadmissions] = useState<PreadmissionDept[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    try {
      const [queuesRes, preRes] = await Promise.all([
        fetch('/api/monitor/all-queues'),
        fetch('/api/monitor/preadmissions'),
      ])
      if (queuesRes.ok) {
        const data = await queuesRes.json()
        setQueues(data)
      }
      if (preRes.ok) {
        const data = await preRes.json()
        setPreadmissions(data)
      }
    } catch (error) {
      console.error('Error fetching monitor data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Link href="/" className="text-hospital-blue-light hover:text-white hover:underline text-sm font-medium inline-flex items-center gap-1">
            ← Volver al inicio
          </Link>
        </div>
        <h1 className="text-4xl font-bold mb-8 text-center">Pantalla de Llamados</h1>

        {/* Colas de cupos / turnos por servicio */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {queues.map((queue) => (
            <div key={queue.service_id} className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-4 text-hospital-blue-light">
                {queue.service_name}
              </h2>
              
              {/* Current Ticket */}
              {queue.current && (
                <div className="bg-hospital-blue rounded-lg p-4 mb-4 animate-pulse">
                  <div className="text-sm text-gray-300 mb-1">Llamando ahora:</div>
                  <div className="text-4xl font-bold">{queue.current.ticket_number}</div>
                  {queue.current.wait_time !== null && (
                    <div className="text-sm text-gray-300 mt-2">
                      Tiempo de espera: {queue.current.wait_time} min
                    </div>
                  )}
                </div>
              )}

              {/* Queue List */}
              <div className="space-y-2">
                <div className="text-sm text-gray-400 mb-2">En cola:</div>
                {queue.queue.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">No hay pacientes en cola</div>
                ) : (
                  queue.queue.slice(0, 10).map((item, index) => (
                    <div
                      key={item.ticket_number}
                      className={`flex justify-between items-center p-3 rounded ${
                        index === 0
                          ? 'bg-gray-700 border-2 border-hospital-blue'
                          : 'bg-gray-700/50'
                      }`}
                    >
                      <span className="text-xl font-semibold">{item.ticket_number}</span>
                      {item.wait_time !== null && (
                        <span className="text-sm text-gray-400">{item.wait_time} min</span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Next Numbers */}
              {queue.next_numbers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Próximos:</div>
                  <div className="flex flex-wrap gap-2">
                    {queue.next_numbers.map((num) => (
                      <span key={num} className="text-sm bg-gray-700 px-2 py-1 rounded">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Preadmisiones (Laboratorio / Radiología) — visible para el administrador junto a los cupos */}
        {preadmissions.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-4 text-hospital-blue-light">
              Preadmisiones solicitadas
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {preadmissions.map((dept) => (
                <div key={dept.departamento} className="bg-gray-800 rounded-lg p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-4 text-hospital-blue-light">
                    {dept.label}
                  </h3>
                  <div className="space-y-2">
                    {dept.items.length === 0 ? (
                      <div className="text-gray-500 text-center py-4">
                        Sin preadmissiones pendientes
                      </div>
                    ) : (
                      dept.items.slice(0, 10).map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-3 rounded bg-gray-700/50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{item.nombre}</div>
                            <div className="text-xs text-gray-400">
                              {item.cedula} · {formatDateToDdMmYyyy(item.fechapreadmision)}
                            </div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300 shrink-0 ml-2">
                            {item.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer with timestamp */}
        <div className="mt-8 text-center text-gray-500">
          Última actualización: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
