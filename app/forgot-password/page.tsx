'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      // TODO: Implementar endpoint de recuperación de contraseña en el backend
      // Por ahora solo mostramos un mensaje
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage('Si el email existe, recibirás instrucciones para recuperar tu contraseña.')
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud')
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
          <div className="flex justify-center gap-4 items-center mb-4">
            <Image src="/logo-hospital-santa-fe.svg" alt="Hospital Santa Fe" width={180} height={64} className="h-14 w-auto object-contain" />
            <Image src="/logo.png" alt="" width={64} height={64} className="h-16 w-16 object-contain shrink-0" role="presentation" />
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
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {message}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
              placeholder="tu@email.com"
            />
            <p className="mt-2 text-sm text-gray-500">
              Ingresa tu email y te enviaremos instrucciones para recuperar tu contraseña.
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

        <div className="mt-6 text-center">
          <Link href="/login" className="text-hospital-blue hover:underline text-sm">
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
      </div>
    </div>
  )
}
