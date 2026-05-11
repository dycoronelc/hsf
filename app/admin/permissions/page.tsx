'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../components/SiteLayout'
import { useAuth } from '../../providers'
import { roleLabel } from '@/lib/roleLabels'

type PermissionRow = { key: string; label: string }

export default function AdminPermissionsPage() {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({})
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
      setRoles(data.roles ?? [])
      setMatrix(data.matrix ?? {})
      setSelectedRole((current) => current || data.roles?.[0] || '')
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
      setMessage(`Permisos actualizados para ${roleLabel(selectedRole)}.`)
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-hospital-blue hover:underline text-sm">
              ← Administración
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Permisos por rol</h1>
            <p className="text-gray-600 mt-1">
              Defina qué acciones puede ejecutar cada rol operativo en la plataforma.
            </p>
          </div>
          <button
            type="button"
            onClick={saveRole}
            disabled={saving || !selectedRole}
            className="px-5 py-2.5 bg-hospital-blue text-white rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar rol seleccionado'}
          </button>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
        {message && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol a configurar</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-gray-600">Cargando permisos...</p>
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
    </SiteLayout>
  )
}
