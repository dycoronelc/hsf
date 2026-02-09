'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Survey {
  id: number
  ticketId?: number
  appointmentId?: number
  npsScore?: number
  csatScore?: number
  comments?: string
  isCompleted: boolean
}

export default function SurveyPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.id as string
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [csatScore, setCsatScore] = useState<number | null>(null)
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchSurvey()
  }, [surveyId])

  const fetchSurvey = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/surveys/${surveyId}`,
      )
      if (response.ok) {
        const data = await response.json()
        setSurvey(data)
        if (data.isCompleted) {
          setSubmitted(true)
          setNpsScore(data.npsScore)
          setCsatScore(data.csatScore)
          setComments(data.comments || '')
        }
      } else {
        setError('Encuesta no encontrada')
      }
    } catch (error) {
      setError('Error al cargar la encuesta')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (npsScore === null || csatScore === null) {
      setError('Por favor complete todos los campos requeridos')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(
        `/api/surveys/${surveyId}/submit`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            npsScore,
            csatScore,
            comments: comments || undefined,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Error al enviar encuesta')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
        <div className="mb-4 w-full max-w-md text-left">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium">
            ← Volver al inicio
          </Link>
        </div>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hospital-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando encuesta...</p>
        </div>
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
        <div className="mb-4 w-full max-w-md">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium">
            ← Volver al inicio
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias!</h2>
          <p className="text-gray-600 mb-6">
            Su encuesta ha sido enviada exitosamente. Su opinión es muy importante para nosotros.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-4">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
            ← Volver al inicio
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Encuesta de Satisfacción</h1>
            <p className="text-gray-600">
              Su opinión es muy importante para nosotros. Por favor complete esta breve encuesta.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="space-y-8">
            {/* NPS Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                ¿Qué tan probable es que recomiende Hospital Santa Fe a un amigo o familiar?
                <span className="text-red-500">*</span>
              </label>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Poco probable</span>
                <div className="flex space-x-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      onClick={() => setNpsScore(score)}
                      className={`w-12 h-12 rounded-lg border-2 transition-all ${
                        npsScore === score
                          ? 'bg-hospital-blue text-white border-hospital-blue'
                          : 'border-gray-300 hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-500">Muy probable</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Net Promoter Score (0-10)
              </p>
            </div>

            {/* CSAT Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                ¿Qué tan satisfecho está con el servicio recibido?
                <span className="text-red-500">*</span>
              </label>
              <div className="flex justify-center space-x-4">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => setCsatScore(score)}
                    className={`w-16 h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                      csatScore === score
                        ? 'bg-hospital-blue text-white border-hospital-blue'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <span className="text-2xl">
                      {score === 1 ? '😞' : score === 2 ? '😐' : score === 3 ? '😊' : score === 4 ? '😄' : '😍'}
                    </span>
                    <span className="text-xs mt-1">{score}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">Muy insatisfecho</span>
                <span className="text-xs text-gray-500">Muy satisfecho</span>
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios adicionales (opcional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital-blue focus:border-transparent"
                placeholder="Comparta sus comentarios, sugerencias o experiencias..."
              />
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={npsScore === null || csatScore === null || submitting}
                className="px-8 py-3 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {submitting ? 'Enviando...' : 'Enviar Encuesta'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
