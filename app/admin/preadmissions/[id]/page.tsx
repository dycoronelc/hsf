'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteLayout } from '../../../components/SiteLayout'
import { useAuth } from '../../../providers'
import { authHeaders } from '@/lib/authToken'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import {
  ARRIVAL_STATE_LABELS,
  ATTACHMENT_FIELD_LABELS,
  DEPARTAMENTO_LABELS,
  formatPreadmissionDate,
  PREADMISSION_STATUS_LABELS,
} from '@/lib/preadmissionLabels'

type PreadmissionDetail = {
  id: number
  departamento: string
  registradoComo: string
  name1: string
  name2?: string | null
  apellido1: string
  apellido2?: string | null
  pasaporte: string
  cedula: string
  sexo: string
  fechanac: string
  nacionalidad: string
  estadocivil: string
  tiposangre: string
  email: string
  celular: string
  celularPrefix?: string | null
  provincia1: string
  distrito1: string
  corregimiento1: string
  direccion1: string
  encasourgencia: string
  relacion: string
  email3: string
  celular3: string
  provincia3?: string | null
  distrito3?: string | null
  corregimiento3?: string | null
  direccion3?: string | null
  fechaprobableatencion?: string | null
  medico?: string | null
  doblecobertura: string
  compania1?: string | null
  poliza1?: string | null
  diagnostico?: string | null
  procedimientoEstudio?: string | null
  numerocotizacion?: string | null
  status: string
  arrivalState: string
  fechapreadmision: string
  observaciones?: string | null
  reviewedAt?: string | null
  qrCode?: string | null
  ticketId?: number | null
  confirmedArrivalAt?: string | null
  attachmentUrls?: Record<string, string | null>
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 sm:col-span-2 break-words">{value || '—'}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-lg p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <dl>{children}</dl>
    </section>
  )
}

export default function AdminPreadmissionDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, user, token, authHydrated } = useAuth()
  const router = useRouter()
  const [detail, setDetail] = useState<PreadmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/preadmission/${params.id}`, {
        headers: authHeaders(token),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'No se pudo cargar la preadmisión'))
      }
      const data: PreadmissionDetail = await response.json()
      setDetail(data)
      setReviewStatus(data.status)
      setObservaciones(data.observaciones || '')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [token, params.id])

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

  const openAttachment = async (url: string, label: string) => {
    if (!token) return
    try {
      const response = await fetch(url, { headers: authHeaders(token) })
      if (!response.ok) throw new Error('No se pudo abrir el archivo')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch {
      alert(`No se pudo abrir: ${label}`)
    }
  }

  const saveReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !detail) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/preadmission/${detail.id}/review`, {
        method: 'PATCH',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: reviewStatus, observaciones: observaciones.trim() || undefined }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'No se pudo guardar la revisión'))
      }
      setMessage('Revisión guardada correctamente.')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const fullName = detail
    ? [detail.name1, detail.name2, detail.apellido1, detail.apellido2].filter(Boolean).join(' ')
    : ''

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link href="/admin" className="text-hospital-blue hover:underline font-medium">
            ← Administración
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/admin/preadmissions" className="text-hospital-blue hover:underline font-medium">
            Preadmisiones
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Cargando…</div>
        ) : error && !detail ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        ) : detail ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Preadmisión #{detail.id}</h1>
              <p className="text-gray-600 mt-2">{fullName}</p>
            </div>

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Section title="Resumen operativo">
              <DetailRow label="Área" value={DEPARTAMENTO_LABELS[detail.departamento] ?? detail.departamento} />
              <DetailRow label="Estado revisión" value={PREADMISSION_STATUS_LABELS[detail.status] ?? detail.status} />
              <DetailRow label="Estado llegada" value={ARRIVAL_STATE_LABELS[detail.arrivalState] ?? detail.arrivalState} />
              <DetailRow label="Fecha probable atención" value={detail.fechaprobableatencion} />
              <DetailRow label="Enviado el" value={formatPreadmissionDate(detail.fechapreadmision)} />
              <DetailRow label="Ticket vinculado" value={detail.ticketId ? `#${detail.ticketId}` : '—'} />
              <DetailRow label="Código QR" value={detail.qrCode} />
              <DetailRow label="Llegada confirmada" value={formatPreadmissionDate(detail.confirmedArrivalAt)} />
            </Section>

            <Section title="Datos personales">
              <DetailRow label="Documento" value={detail.cedula} />
              <DetailRow label="Tipo ID" value={detail.pasaporte === 'C' ? 'Cédula' : 'Pasaporte'} />
              <DetailRow label="Sexo" value={detail.sexo === 'M' ? 'Masculino' : 'Femenino'} />
              <DetailRow label="Fecha nacimiento" value={detail.fechanac} />
              <DetailRow label="Nacionalidad" value={detail.nacionalidad} />
              <DetailRow label="Estado civil" value={detail.estadocivil} />
              <DetailRow label="Tipo sangre" value={detail.tiposangre} />
              <DetailRow label="Registrado como" value={detail.registradoComo} />
            </Section>

            <Section title="Contacto">
              <DetailRow label="Correo" value={detail.email} />
              <DetailRow
                label="Celular"
                value={`+${detail.celularPrefix || '507'} ${detail.celular}`}
              />
              <DetailRow
                label="Dirección"
                value={[detail.direccion1, detail.corregimiento1, detail.distrito1, detail.provincia1]
                  .filter(Boolean)
                  .join(', ')}
              />
            </Section>

            <Section title="Contacto de emergencia">
              <DetailRow label="Nombre" value={detail.encasourgencia} />
              <DetailRow label="Relación" value={detail.relacion} />
              <DetailRow label="Correo" value={detail.email3} />
              <DetailRow label="Celular" value={detail.celular3} />
              <DetailRow
                label="Dirección"
                value={[detail.direccion3, detail.corregimiento3, detail.distrito3, detail.provincia3]
                  .filter(Boolean)
                  .join(', ')}
              />
            </Section>

            <Section title="Seguro y clínica">
              <DetailRow label="Doble cobertura" value={detail.doblecobertura} />
              <DetailRow label="Compañía" value={detail.compania1} />
              <DetailRow label="Póliza" value={detail.poliza1} />
              <DetailRow label="Médico referente" value={detail.medico} />
              <DetailRow label="Diagnóstico" value={detail.diagnostico} />
              <DetailRow label="Procedimiento / estudio" value={detail.procedimientoEstudio} />
              <DetailRow label="N.º cotización" value={detail.numerocotizacion} />
            </Section>

            {detail.attachmentUrls && (
              <section className="bg-white rounded-lg shadow-lg p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Documentos adjuntos
                </h2>
                <ul className="space-y-2">
                  {Object.entries(detail.attachmentUrls).map(([field, url]) =>
                    url ? (
                      <li key={field}>
                        <button
                          type="button"
                          onClick={() => openAttachment(url, ATTACHMENT_FIELD_LABELS[field] ?? field)}
                          className="text-hospital-blue hover:underline font-medium text-sm"
                        >
                          {ATTACHMENT_FIELD_LABELS[field] ?? field}
                        </button>
                      </li>
                    ) : null,
                  )}
                </ul>
              </section>
            )}

            <section className="bg-white rounded-lg shadow-lg p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Administrar revisión
              </h2>
              <form onSubmit={saveReview} className="space-y-4 max-w-xl">
                <div>
                  <label htmlFor="review-status" className="block text-sm font-medium text-gray-700 mb-1">
                    Estado de revisión
                  </label>
                  <select
                    id="review-status"
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Object.entries(PREADMISSION_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    id="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Notas internas para el equipo…"
                  />
                </div>
                {detail.reviewedAt && (
                  <p className="text-xs text-gray-500">
                    Última revisión: {formatPreadmissionDate(detail.reviewedAt)}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-hospital-blue text-white rounded-lg font-semibold hover:bg-hospital-blue-dark disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar revisión'}
                </button>
              </form>
            </section>
          </div>
        ) : null}
      </div>
    </SiteLayout>
  )
}
