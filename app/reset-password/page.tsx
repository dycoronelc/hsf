'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[a-z0-9])[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!token) {
      setError('Enlace de recuperación inválido')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!PASSWORD_RULE.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, ser alfanumérica e incluir una mayúscula')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo restablecer la contraseña')
      }
      setMessage(data.message || 'Contraseña actualizada correctamente')
      setTimeout(() => router.push('/login'), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Restablecer contraseña</h1>
      <p className="text-gray-600 mb-6">Hospital Santa Fe</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-hospital-blue text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-hospital-blue hover:underline">Volver al inicio de sesión</Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <Suspense fallback={<div className="text-gray-600">Cargando...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
