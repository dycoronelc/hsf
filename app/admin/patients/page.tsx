'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { formatDateToDdMmYyyy } from '@/lib/dateUtils'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { filterPersonNameInput, isValidPersonName, PERSON_NAME_MESSAGE } from '@/lib/validation/person-fields'

interface PatientRow {
  id: number
  email: string
  fullName: string | null
  nationalId: string | null
  phone: string | null
  birthDate: string | null
  isActive: boolean
  createdAt: string
}

const emptyEdit = {
  fullName: '',
  email: '',
  nationalId: '',
  phone: '',
  birthDate: '',
  isActive: true,
}

export default function AdminPatientsPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [q, setQ] = useState('')
  const [appliedQ, setAppliedQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editPatient, setEditPatient] = useState<PatientRow | null>(null)
  const [editForm, setEditForm] = useState(emptyEdit)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (appliedQ.trim()) params.set('q', appliedQ.trim())
      const response = await fetch(`/api/admin/patients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('No se pudieron cargar los pacientes')
      setPatients(await response.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [token, appliedQ])

  useEffect(() => {
    if (!authHydrated) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    load()
  }, [authHydrated, isAuthenticated, user, router, load])

  const openEdit = (p: PatientRow) => {
    setEditPatient(p)
    setEditForm({
      fullName: p.fullName || '',
      email: p.email,
      nationalId: p.nationalId || '',
      phone: p.phone || '',
      birthDate: p.birthDate || '',
      isActive: p.isActive,
    })
    setMessage('')
    setError('')
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPatient || !token) return
    if (editForm.fullName && !isValidPersonName(editForm.fullName)) {
      setError(`Nombre: ${PERSON_NAME_MESSAGE}`)
      return
    }
    const phone = editForm.phone.replace(/\D/g, '')
    if (phone && (phone.length > 8 || !/^\d+$/.test(phone))) {
      setError('El celular debe tener solo dígitos (máximo 8)')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/patients/${editPatient.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: editForm.fullName || null,
          email: editForm.email,
          nationalId: editForm.nationalId || null,
          phone: phone || null,
          birthDate: editForm.birthDate || null,
          isActive: editForm.isActive,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'No se pudo actualizar el paciente'))
      }
      setMessage('Paciente actualizado')
      setEditPatient(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!authHydrated || !isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pacientes registrados</h1>
            <p className="text-sm text-gray-600 mt-1">
              Consulte y edite cuentas de pacientes registrados en la plataforma.
            </p>
          </div>
          <Link href="/admin" className="text-hospital-blue hover:underline text-sm font-medium">
            ← Administración
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setAppliedQ(q)}
            placeholder="Buscar por correo, nombre, cédula o celular"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <button
            type="button"
            onClick={() => setAppliedQ(q)}
            className="px-4 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark"
          >
            Buscar
          </button>
        </div>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">ID</th>
                <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold">Correo</th>
                <th className="text-left px-4 py-3 font-semibold">Cédula</th>
                <th className="text-left px-4 py-3 font-semibold">Celular</th>
                <th className="text-left px-4 py-3 font-semibold">Registro</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
                <th className="text-right px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loading && patients.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No hay pacientes con los filtros actuales.
                  </td>
                </tr>
              )}
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{p.id}</td>
                  <td className="px-4 py-3">{p.fullName || '—'}</td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3 font-mono">{p.nationalId || '—'}</td>
                  <td className="px-4 py-3">{p.phone || '—'}</td>
                  <td className="px-4 py-3">{formatDateToDdMmYyyy(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-hospital-blue hover:underline font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editPatient && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Editar paciente #{editPatient.id}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm({ ...editForm, fullName: filterPersonNameInput(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                <input
                  value={editForm.nationalId}
                  onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Celular (máx. 8)</label>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '').slice(0, 8) })
                  }
                  maxLength={8}
                  inputMode="numeric"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
              <input
                value={editForm.birthDate}
                onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
              Cuenta activa
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditPatient(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-hospital-blue text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </SiteLayout>
  )
}
