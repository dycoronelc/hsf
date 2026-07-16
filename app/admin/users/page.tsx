'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { RowActionsMenu } from '../../components/RowActionsMenu'
import { useAuth } from '../../providers'
import { roleLabel } from '@/lib/roleLabels'
import { filterPersonNameInput, isValidPersonName, PERSON_NAME_MESSAGE } from '@/lib/validation/person-fields'

interface StaffUser {
  id: number
  email: string
  fullName: string | null
  role: string
  isActive: boolean
  sessionNeverExpires?: boolean
  sessionExpiresMinutes?: number | null
}

const emptyCreate = {
  email: '',
  password: '',
  fullName: '',
  role: 'reception',
}

function sortRoles(roles: string[]) {
  return [...roles].sort((a, b) => roleLabel(a).localeCompare(roleLabel(b), 'es'))
}

export default function AdminUsersPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<StaffUser[]>([])
  const [assignableRoles, setAssignableRoles] = useState<string[]>([])
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editUser, setEditUser] = useState<StaffUser | null>(null)
  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'reception',
    sessionNeverExpires: false,
    sessionExpiresMinutes: '' as string,
  })

  const loadAssignableRoles = useCallback(async () => {
    if (!token) return
    try {
      const response = await fetch('/api/admin/role-permissions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      const data = await response.json()
      const active = (data.roles as string[] | undefined) ?? []
      setAssignableRoles(sortRoles(Array.from(new Set([...active, 'admin']))))
    } catch {
      setAssignableRoles([])
    }
  }, [token])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('No se pudieron cargar los usuarios')
      setUsers(await response.json())
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
    loadAssignableRoles()
  }, [authHydrated, isAuthenticated, user, router, load, loadAssignableRoles])

  useEffect(() => {
    if (!editUser) return
    setEditForm({
      fullName: editUser.fullName || '',
      role: editUser.role,
      sessionNeverExpires: !!editUser.sessionNeverExpires,
      sessionExpiresMinutes:
        editUser.sessionExpiresMinutes != null ? String(editUser.sessionExpiresMinutes) : '',
    })
  }, [editUser])

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    const trimmedName = createForm.fullName.trim()
    if (trimmedName && !isValidPersonName(trimmedName)) {
      setError(PERSON_NAME_MESSAGE)
      return
    }
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password,
          fullName: createForm.fullName.trim() || undefined,
          role: createForm.role,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo crear el usuario')
      }
      setCreateForm(emptyCreate)
      setMessage('Usuario creado correctamente.')
      await load()
      await loadAssignableRoles()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateUser = async (
    id: number,
    patch: {
      role?: string
      isActive?: boolean
      fullName?: string
      sessionNeverExpires?: boolean
      sessionExpiresMinutes?: number | null
    },
  ) => {
    if (!token) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo actualizar el usuario')
      }
      setMessage('Usuario actualizado.')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveEditModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    const trimmedName = editForm.fullName.trim()
    if (trimmedName && !isValidPersonName(trimmedName)) {
      setError(PERSON_NAME_MESSAGE)
      return
    }
    await updateUser(editUser.id, {
      fullName: editForm.fullName.trim(),
      role: editForm.role,
      sessionNeverExpires: editForm.sessionNeverExpires,
      sessionExpiresMinutes: editForm.sessionNeverExpires
        ? null
        : editForm.sessionExpiresMinutes.trim()
          ? Number(editForm.sessionExpiresMinutes)
          : null,
    })
    setEditUser(null)
  }

  const deleteUser = async (u: StaffUser) => {
    if (!token) return
    if (!window.confirm(`¿Eliminar definitivamente la cuenta ${u.email}? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo eliminar el usuario')
      }
      setMessage('Usuario eliminado.')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const roleOptionsFor = (currentRole: string) => {
    const merged = Array.from(new Set([...assignableRoles, currentRole]))
    return sortRoles(merged)
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
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Usuarios del sistema</h1>
          <p className="text-gray-600 mt-1">
            Cree cuentas de personal, asigne roles y controle el acceso. La contraseña debe incluir al menos una
            mayúscula y ocho caracteres.
          </p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
        {message && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>}

        <div className="grid lg:grid-cols-3 gap-6">
          <form onSubmit={createUser} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Nuevo usuario</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña inicial</label>
              <input
                type="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input
                value={createForm.fullName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, fullName: filterPersonNameInput(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving || assignableRoles.length === 0}
              className="w-full bg-hospital-blue text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear usuario'}
            </button>
            {assignableRoles.length === 0 && (
              <p className="text-xs text-amber-700">No hay roles activos en la matriz. Revise Permisos por rol.</p>
            )}
          </form>

          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Usuarios registrados</h2>
            {loading ? (
              <p className="text-gray-600">Cargando usuarios...</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 pr-3">Nombre</th>
                    <th className="py-2 pr-3">Correo</th>
                    <th className="py-2 pr-3">Rol</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 w-12 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((staff) => (
                    <tr key={staff.id} className="border-b border-gray-100">
                      <td className="py-3 pr-3">{staff.fullName || '—'}</td>
                      <td className="py-3 pr-3">{staff.email}</td>
                      <td className="py-3 pr-3">{roleLabel(staff.role)}</td>
                      <td className="py-3 pr-3">
                        <span className={staff.isActive ? 'text-green-700' : 'text-gray-500'}>
                          {staff.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <RowActionsMenu
                          items={[
                            {
                              key: 'edit',
                              label: 'Editar',
                              onClick: () => setEditUser(staff),
                            },
                            {
                              key: 'toggle',
                              label: staff.isActive ? 'Desactivar' : 'Activar',
                              onClick: () => updateUser(staff.id, { isActive: !staff.isActive }),
                              disabled: saving,
                            },
                            {
                              key: 'del',
                              label: 'Eliminar',
                              danger: true,
                              onClick: () => deleteUser(staff),
                              disabled: saving || staff.id === user?.id,
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

        {editUser && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
            <form
              onSubmit={saveEditModal}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">Editar usuario</h3>
              <p className="text-sm text-gray-600">{editUser.email}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {roleOptionsFor(editUser.role).map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editForm.sessionNeverExpires}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      sessionNeverExpires: e.target.checked,
                      sessionExpiresMinutes: e.target.checked ? '' : editForm.sessionExpiresMinutes,
                    })
                  }
                />
                Sesión sin expiración (p. ej. monitor)
              </label>
              {!editForm.sessionNeverExpires && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiración de sesión (minutos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.sessionExpiresMinutes}
                    onChange={(e) => setEditForm({ ...editForm, sessionExpiresMinutes: e.target.value })}
                    placeholder="Vacío = usar JWT_EXPIRES del rol/env"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si queda vacío, se usa la variable de entorno del rol (JWT_EXPIRES_*).
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
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
