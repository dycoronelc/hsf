'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { apiErrorMessage } from '@/lib/apiErrorMessage'

interface MediaItem {
  id: number
  kind: 'message' | 'image' | 'video'
  title: string
  body: string | null
  isActive: boolean
  sortOrder: number
}

const emptyForm = {
  kind: 'message' as MediaItem['kind'],
  title: '',
  body: '',
  isActive: true,
  sortOrder: 0,
}

export default function AdminMonitorMediaPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<MediaItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/monitor-media', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('No se pudo cargar el contenido')
      setItems(await response.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
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

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/monitor-media', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          body: form.body.trim() || null,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'No se pudo crear el contenido'))
      }
      setForm(emptyForm)
      setMessage('Contenido agregado al monitor')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: MediaItem) => {
    if (!token) return
    await fetch(`/api/admin/monitor-media/${item.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: !item.isActive }),
    })
    await load()
  }

  const removeItem = async (id: number) => {
    if (!token) return
    if (!confirm('¿Eliminar este contenido del monitor?')) return
    await fetch(`/api/admin/monitor-media/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await load()
  }

  if (!authHydrated || !isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contenido del monitor</h1>
            <p className="text-sm text-gray-600 mt-1">
              Cargue mensajes institucionales, imágenes (URL) o videos (URL de YouTube o archivo) para la
              pantalla de llamados.
            </p>
          </div>
          <Link href="/admin" className="text-hospital-blue hover:underline text-sm font-medium">
            ← Administración
          </Link>
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

        <form onSubmit={createItem} className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Agregar contenido</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as MediaItem['kind'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="message">Mensaje de texto</option>
                <option value="image">Imagen (URL)</option>
                <option value="video">Video (URL YouTube o archivo)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.kind === 'message' ? 'Texto del mensaje' : 'URL'}
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={form.kind === 'message' ? 4 : 2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder={
                form.kind === 'video'
                  ? 'https://www.youtube.com/watch?v=...'
                  : form.kind === 'image'
                    ? 'https://.../imagen.jpg'
                    : 'Lávate las manos con frecuencia...'
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Activo en el monitor
          </label>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-hospital-blue text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Agregar'}
          </button>
        </form>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <p className="p-6 text-gray-600">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-gray-500">Aún no hay contenido configurado.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Orden</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Título</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="px-4 py-3">{item.sortOrder}</td>
                    <td className="px-4 py-3 capitalize">{item.kind}</td>
                    <td className="px-4 py-3">{item.title}</td>
                    <td className="px-4 py-3">{item.isActive ? 'Activo' : 'Inactivo'}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        className="text-hospital-blue hover:underline"
                      >
                        {item.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SiteLayout>
  )
}
