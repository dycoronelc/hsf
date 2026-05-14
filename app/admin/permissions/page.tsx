'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { RowActionsMenu } from '../../components/RowActionsMenu'
import { useAuth } from '../../providers'
import { roleLabel } from '@/lib/roleLabels'

type PermissionRow = { key: string; label: string }

type RoleSummary = {
  role: string
  isActive: boolean
  enabledCount: number
  totalCount: number
}

export default function AdminPermissionsPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({})
  const [roleSummaries, setRoleSummaries] = useState<RoleSummary[]>([])
  const [addableRoles, setAddableRoles] = useState<string[]>([])
  const [activeRoles, setActiveRoles] = useState<string[]>([])
  const [newRoleToAdd, setNewRoleToAdd] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/role-permissions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error('No se pudo cargar la matriz de permisos')
      }
      const data = await response.json()
      setPermissions(data.permissions ?? [])
      setMatrix(data.matrix ?? {})
      const summaries: RoleSummary[] = data.roleSummaries ?? []
      setRoleSummaries(summaries)
      setAddableRoles(data.addableRoles ?? [])
      const actives: string[] = data.roles ?? []
      setActiveRoles(actives)

      const allRoles = summaries.map((s) => s.role)
      setSelectedRole((current) => {
        if (current && allRoles.includes(current)) return current
        if (actives.length) return actives[0]
        return allRoles[0] || ''
      })
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
    if (addableRoles.length > 0 && !addableRoles.includes(newRoleToAdd)) {
      setNewRoleToAdd(addableRoles[0])
    }
  }, [addableRoles, newRoleToAdd])

  const togglePermission = (permissionKey: string) => {
    if (!selectedRole) return
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [permissionKey]: !prev[selectedRole]?.[permissionKey],
      },
    }))
  }

  const saveRole = async () => {
    if (!token || !selectedRole) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/role-permissions', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          permissions: matrix[selectedRole] ?? {},
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudieron guardar los permisos')
      }
      const data = await response.json()
      setMatrix(data.matrix ?? matrix)
      setRoleSummaries(data.roleSummaries ?? [])
      setAddableRoles(data.addableRoles ?? [])
      setActiveRoles(data.roles ?? [])
      setMessage(`Permisos actualizados para ${roleLabel(selectedRole)}.`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addRoleToMatrix = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !newRoleToAdd) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/role-matrix/roles', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRoleToAdd }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo agregar el rol')
      }
      const data = await response.json()
      setMatrix(data.matrix ?? {})
      setRoleSummaries(data.roleSummaries ?? [])
      setAddableRoles(data.addableRoles ?? [])
      setActiveRoles(data.roles ?? [])
      setSelectedRole(newRoleToAdd)
      setMessage(`Rol ${roleLabel(newRoleToAdd)} agregado a la matriz.`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const patchMatrixRole = async (role: string, isActive: boolean) => {
    if (!token) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/admin/role-matrix/roles/${encodeURIComponent(role)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo actualizar el rol')
      }
      const data = await response.json()
      setMatrix(data.matrix ?? {})
      setRoleSummaries(data.roleSummaries ?? [])
      setAddableRoles(data.addableRoles ?? [])
      setActiveRoles(data.roles ?? [])
      setMessage(isActive ? `Rol ${roleLabel(role)} reactivado.` : `Rol ${roleLabel(role)} desactivado.`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeRoleFromMatrix = async (role: string) => {
    if (!token) return
    if (
      !window.confirm(
        `¿Eliminar el rol "${roleLabel(role)}" de la matriz? Se borrarán sus permisos guardados; podrá volver a agregarlo después con valores por defecto.`,
      )
    ) {
      return
    }
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/admin/role-matrix/roles/${encodeURIComponent(role)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo eliminar el rol')
      }
      const data = await response.json()
      setMatrix(data.matrix ?? {})
      setRoleSummaries(data.roleSummaries ?? [])
      setAddableRoles(data.addableRoles ?? [])
      setActiveRoles(data.roles ?? [])
      setMessage(`Rol ${roleLabel(role)} eliminado de la matriz.`)
      setSelectedRole((r) => {
        if (r !== role) return r
        const summaries: RoleSummary[] = data.roleSummaries ?? []
        const actives: string[] = data.roles ?? []
        const allRoles = summaries.map((s) => s.role)
        if (actives.length) return actives[0]
        return allRoles[0] || ''
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const editorRoleOptions = roleSummaries.map((s) => s.role)

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
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Permisos por rol</h1>
          <p className="text-gray-600 mt-1">
            Agregue roles a la matriz, active o desactive perfiles y defina qué acciones puede ejecutar cada rol
            operativo.
          </p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
        {message && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-8">
            <form onSubmit={addRoleToMatrix} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Agregar rol a la matriz</h2>
              <p className="text-sm text-gray-600">
                Los roles provienen del catálogo del hospital. Si quitó un rol antes, puede volver a incluirlo aquí.
              </p>
              {addableRoles.length === 0 ? (
                <p className="text-sm text-gray-500">Todos los roles operativos están en la matriz.</p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      value={newRoleToAdd}
                      onChange={(e) => setNewRoleToAdd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {addableRoles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-gray-800 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Agregar rol'}
                  </button>
                </>
              )}
            </form>

            <div className="border-t border-gray-200 pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Permisos del rol</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol a configurar</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {editorRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                      {!activeRoles.includes(role) ? ' (inactivo)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={saveRole}
                disabled={saving || !selectedRole}
                className="w-full bg-hospital-blue text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar permisos del rol'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Roles en la matriz</h2>
              {loading ? (
                <p className="text-gray-600">Cargando...</p>
              ) : roleSummaries.length === 0 ? (
                <p className="text-gray-600">No hay roles configurados.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-2 pr-3">Rol</th>
                      <th className="py-2 pr-3">Permisos</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 w-12 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roleSummaries.map((row) => (
                      <tr key={row.role} className="border-b border-gray-100">
                        <td className="py-3 pr-3 font-medium text-gray-900">{roleLabel(row.role)}</td>
                        <td className="py-3 pr-3 text-gray-700">
                          {row.enabledCount}/{row.totalCount}
                        </td>
                        <td className="py-3 pr-3">
                          <span className={row.isActive ? 'text-green-700' : 'text-gray-500'}>
                            {row.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <RowActionsMenu
                            items={[
                              {
                                key: 'edit',
                                label: 'Editar permisos',
                                onClick: () => setSelectedRole(row.role),
                              },
                              {
                                key: 'toggle',
                                label: row.isActive ? 'Desactivar' : 'Activar',
                                onClick: () => patchMatrixRole(row.role, !row.isActive),
                                disabled: saving,
                              },
                              {
                                key: 'del',
                                label: 'Eliminar de la matriz',
                                danger: true,
                                onClick: () => removeRoleFromMatrix(row.role),
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

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalle de permisos — {roleLabel(selectedRole)}</h2>
              {loading ? (
                <p className="text-gray-600">Cargando permisos...</p>
              ) : !selectedRole ? (
                <p className="text-gray-600">Seleccione un rol.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="py-3 pr-4 font-semibold text-gray-900">Permiso</th>
                        <th className="py-3 font-semibold text-gray-900">Habilitado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.map((permission) => (
                        <tr key={permission.key} className="border-b border-gray-100">
                          <td className="py-3 pr-4 text-gray-800">{permission.label}</td>
                          <td className="py-3">
                            <input
                              type="checkbox"
                              checked={!!matrix[selectedRole]?.[permission.key]}
                              onChange={() => togglePermission(permission.key)}
                              className="h-4 w-4 text-hospital-blue rounded border-gray-300"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  )
}
