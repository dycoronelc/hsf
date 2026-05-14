'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { RowActionsMenu } from '../../components/RowActionsMenu'
import { useAuth } from '../../providers'

interface TicketType {
  id: number
  name: string
  code: string
  area: string
  ticketPrefix: string | null
  priorityLevel: number
  estimatedTime: number | null
  isActive: boolean
}

const emptyForm = {
  name: '',
  code: '',
  area: 'ADMISION',
  ticketPrefix: '',
  priorityLevel: '2',
  estimatedTime: '15',
}

export default function AdminTicketTypesPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<TicketType[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editItem, setEditItem] = useState<TicketType | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/ticket-types', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('No se pudieron cargar los tipos de ticket')
      setItems(await response.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

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

  useEffect(() => {
    if (!editItem) return
    setEditForm({
      name: editItem.name,
      code: editItem.code,
      area: editItem.area,
      ticketPrefix: editItem.ticketPrefix || editItem.code,
      priorityLevel: String(editItem.priorityLevel),
      estimatedTime: String(editItem.estimatedTime ?? 15),
    })
  }, [editItem])

  const createTicketType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/ticket-types', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          area: form.area,
          ticketPrefix: form.ticketPrefix || form.code,
          priorityLevel: Number(form.priorityLevel),
          estimatedTime: Number(form.estimatedTime),
          isActive: true,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo crear el tipo de ticket')
      }
      setForm(emptyForm)
      setMessage('Tipo de ticket creado correctamente.')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateTicketType = async (id: number, patch: Partial<TicketType>) => {
    if (!token) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/admin/ticket-types/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo actualizar el tipo de ticket')
      }
      setMessage('Tipo de ticket actualizado.')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveEditModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !editItem) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/admin/ticket-types/${editItem.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          code: editForm.code,
          area: editForm.area,
          ticketPrefix: editForm.ticketPrefix || editForm.code,
          priorityLevel: Number(editForm.priorityLevel),
          estimatedTime: Number(editForm.estimatedTime),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo guardar el tipo de ticket')
      }
      setEditItem(null)
      setMessage('Tipo de ticket actualizado.')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteTicketType = async (id: number) => {
    if (!token) return
    if (!window.confirm('¿Eliminar este tipo de ticket? Solo es posible si no hay tickets asociados.')) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/admin/ticket-types/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo eliminar el tipo de ticket')
      }
      setMessage('Tipo de ticket eliminado.')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!authHydrated || !isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-hospital-blue hover:underline text-sm">
            ← Administración
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Tipos de ticket</h1>
          <p className="text-gray-600 mt-1">
            Configure nomenclaturas, prioridades y tiempos estimados por tipo de atención.
          </p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
        {message && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>}

        <div className="grid lg:grid-cols-3 gap-6">
          <form onSubmit={createTicketType} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Nuevo tipo</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código interno</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prefijo de ticket</label>
              <input
                value={form.ticketPrefix}
                onChange={(e) => setForm({ ...form, ticketPrefix: e.target.value.toUpperCase() })}
                placeholder="Ej: LR, H, URG"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
              <select
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="ADMISION">Admisión</option>
                <option value="LAB">Laboratorio</option>
                <option value="RAD">Radiología</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad (1-3)</label>
                <select
                  value={form.priorityLevel}
                  onChange={(e) => setForm({ ...form, priorityLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minutos estimados</label>
                <input
                  type="number"
                  min={1}
                  value={form.estimatedTime}
                  onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-hospital-blue text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear tipo de ticket'}
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipos configurados</h2>
            {loading ? (
              <p className="text-gray-600">Cargando...</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 pr-3">Nombre</th>
                    <th className="py-2 pr-3">Prefijo</th>
                    <th className="py-2 pr-3">Área</th>
                    <th className="py-2 pr-3">Prioridad</th>
                    <th className="py-2 pr-3">Minutos</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 w-12 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code}</div>
                      </td>
                      <td className="py-3 pr-3">{item.ticketPrefix || item.code}</td>
                      <td className="py-3 pr-3">{item.area}</td>
                      <td className="py-3 pr-3">{item.priorityLevel}</td>
                      <td className="py-3 pr-3">{item.estimatedTime ?? '—'}</td>
                      <td className="py-3 pr-3">
                        <span className={item.isActive ? 'text-green-700' : 'text-gray-500'}>
                          {item.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <RowActionsMenu
                          items={[
                            {
                              key: 'edit',
                              label: 'Editar',
                              onClick: () => setEditItem(item),
                            },
                            {
                              key: 'toggle',
                              label: item.isActive ? 'Desactivar' : 'Activar',
                              onClick: () => updateTicketType(item.id, { isActive: !item.isActive }),
                              disabled: saving,
                            },
                            {
                              key: 'del',
                              label: 'Eliminar',
                              danger: true,
                              onClick: () => deleteTicketType(item.id),
                              disabled: saving,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {editItem && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
            <form
              onSubmit={saveEditModal}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-semibold text-gray-900">Editar tipo de ticket</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código interno</label>
                <input
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prefijo de ticket</label>
                <input
                  value={editForm.ticketPrefix}
                  onChange={(e) => setEditForm({ ...editForm, ticketPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                <select
                  value={editForm.area}
                  onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="ADMISION">Admisión</option>
                  <option value="LAB">Laboratorio</option>
                  <option value="RAD">Radiología</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select
                    value={editForm.priorityLevel}
                    onChange={(e) => setEditForm({ ...editForm, priorityLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minutos</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.estimatedTime}
                    onChange={(e) => setEditForm({ ...editForm, estimatedTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-hospital-blue text-white font-medium disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </SiteLayout>
  )
}
