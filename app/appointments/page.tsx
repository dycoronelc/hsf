'use client'

import { Suspense, useState, useEffect } from 'react'
import { useAuth } from '../providers'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppointmentsList } from './AppointmentsList'

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

function AppointmentsContent() {
  const { isAuthenticated, token } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/appointments/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchAppointments()
  }, [isAuthenticated])

  const handleCancel = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      return
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        fetchAppointments()
      }
    } catch (error) {
      console.error('Error canceling appointment:', error)
    }
  }

  const showCreatedSuccess = !!searchParams.get('created')

  return (
    <AppointmentsList
      appointments={appointments}
      onCancel={handleCancel}
      loading={loading}
      showCreatedSuccess={showCreatedSuccess}
    />
  )
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>}>
      <AppointmentsContent />
    </Suspense>
  )
}
