'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HospitalLogo } from '../components/HospitalLogo'
import { apiErrorMessage } from '@/lib/apiErrorMessage'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [debugHint, setDebugHint] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setDebugHint('')
    setResetUrl('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(apiErrorMessage(data, 'Error al procesar la solicitud'))
      }
      setMessage(
        data.message ||
          'Si el correo está registrado como usuario, recibirá instrucciones para recuperar su contraseña.',
      )
      if (typeof data.debugHint === 'string') {
        setDebugHint(data.debugHint)
      }
      if (typeof data.resetUrl === 'string') {
        setResetUrl(data.resetUrl)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <div className="p-4 shrink-0">
        <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
          ← Volver al inicio
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <HospitalLogo width={180} height={64} className="h-14 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h1>
          <p className="text-gray-600 mt-2">Hospital Santa Fe</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded space-y-2">
              <p>{message}</p>
              {resetUrl && (
                <p>
                  <Link href={resetUrl} className="font-semibold underline break-all">
                    Abrir enlace de recuperación (prueba)
                  </Link>
                </p>
              )}
            </div>
          )}

          {debugHint && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm">
              {debugHint}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent text-gray-900 bg-white"
              placeholder="tu@email.com"
            />
            <p className="mt-2 text-sm text-gray-500">
              Use el mismo correo con el que creó su cuenta en la plataforma. Completar una preadmisión
              no crea automáticamente una cuenta de acceso.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-hospital-blue text-white py-3 rounded-lg font-semibold hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar Instrucciones'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            ¿No tiene cuenta?{' '}
            <Link href="/register" className="text-hospital-blue hover:underline font-medium">
              Registrarse
            </Link>
          </p>
          <Link href="/login" className="text-hospital-blue hover:underline text-sm block">
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
      </div>
    </div>
  )
}
