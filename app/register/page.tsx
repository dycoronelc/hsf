'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateInput, getBirthDateValidationMessage } from '@/lib/dateUtils'
import {
  filterDocumentIdInput,
  filterPersonNameInput,
  isValidDocumentIdInput,
  isValidEmail,
  isValidPersonName,
  PERSON_NAME_MESSAGE,
  DOCUMENT_ID_MESSAGE,
  EMAIL_MESSAGE,
  normalizeEmail,
} from '@/lib/validation'
import { normalizeDocumentId } from '@/lib/normalizeDocumentId'
import { CedulaQrCapture } from '../components/CedulaQrCapture'
import { mapParsedToRegisterFields } from '@/lib/cedulaQr'
import { HospitalLogo } from '../components/HospitalLogo'
import { HelpLauncher } from '../components/help/HelpLauncher'

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[a-z0-9])[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    national_id: '',
    birth_date: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isValidEmail(formData.email)) {
      setError(EMAIL_MESSAGE)
      return
    }
    if (!PASSWORD_RULE.test(formData.password)) {
      setError('La contraseña debe tener al menos 8 caracteres, ser alfanumérica e incluir una mayúscula')
      return
    }
    if (!isValidPersonName(formData.full_name)) {
      setError(`Nombre completo: ${PERSON_NAME_MESSAGE}`)
      return
    }
    if (!isValidDocumentIdInput(formData.national_id)) {
      setError(DOCUMENT_ID_MESSAGE)
      return
    }
    const birthDateError = getBirthDateValidationMessage(formData.birth_date)
    if (birthDateError) {
      setError(birthDateError)
      return
    }
    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (!/^\d+$/.test(phoneDigits)) {
      setError('El número de celular debe contener solo dígitos')
      return
    }
    if (phoneDigits.length === 0 || phoneDigits.length > 8) {
      setError('El número de celular debe tener máximo 8 dígitos')
      return
    }
    setLoading(true)
    try {
      const payload = {
        email: normalizeEmail(formData.email),
        password: formData.password,
        fullName: formData.full_name.trim(),
        nationalId: normalizeDocumentId(formData.national_id, 'C'),
        birthDate: formData.birth_date.trim(),
        phone: phoneDigits,
      }
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        const msg = Array.isArray(data.message)
          ? data.message.join('. ')
          : data.message || data.detail || 'Error al registrar'
        throw new Error(msg)
      }

      router.push('/login')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col hospital-page-bg">
      <div className="p-4 shrink-0">
        <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
          ← Volver al inicio
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
          <div
            className="flex items-center justify-center py-5 px-4"
            style={{ backgroundColor: '#00816D' }}
          >
            <HospitalLogo
              width={200}
              height={56}
              className="h-12 w-auto max-w-[90%] object-contain object-center"
            />
          </div>

          <div className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta de Paciente</h1>
              <p className="text-gray-600 mt-2">Registro obligatorio para solicitar preadmisión y servicios.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <CedulaQrCapture
                onParsed={(_, parsed) => {
                  setError('')
                  setFormData((prev) => mapParsedToRegisterFields(prev, parsed))
                }}
                onError={(message) => setError(message)}
              />

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo *
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: filterPersonNameInput(e.target.value) })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label htmlFor="national_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Número de identificación *
                </label>
                <input
                  id="national_id"
                  type="text"
                  value={formData.national_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      national_id: filterDocumentIdInput(e.target.value),
                    })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de nacimiento *
                </label>
                <input
                  id="birth_date"
                  type="text"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: formatDateInput(e.target.value) })}
                  required
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Número de celular *
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 8) })
                  }
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
                  placeholder="61234567"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.29 3.29L12 12m-3.59-3.59L12 12m0 0l3.29 3.29m0 0a9.97 9.97 0 011.83-1.83m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Alfanumérica, mínimo 8 caracteres y al menos una mayúscula.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-hospital-blue text-white py-3 rounded-lg font-semibold hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Registrando...' : 'Registrarse'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-hospital-blue hover:underline">
                  Inicia sesión
                </Link>
              </p>
              <div className="flex justify-center pt-1">
                <HelpLauncher label="¿Necesita ayuda?" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
