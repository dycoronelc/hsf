'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { isValidDdMmYyyy } from '@/lib/dateUtils'
import { CedulaQrCapture } from '../components/CedulaQrCapture'
import { DdMmYyyyDateField } from '../components/DdMmYyyyDateField'
import { mapParsedToPreadmissionFields } from '@/lib/cedulaQr'
import { validatePhoneNumber } from '@/lib/phoneValidation'
import { apiErrorMessage, fetchNetworkErrorMessage, parseJsonResponse } from '@/lib/apiErrorMessage'
import { normalizeDocumentId } from '@/lib/normalizeDocumentId'
import { HospitalLogo } from '../components/HospitalLogo'

const PREADMISSION_ATTACHMENT_FIELDS = [
  'cedulaimagen',
  'ordenimagen',
  'preautorizacion',
  'carnetseguro',
  'certificadoSeguro',
] as const
type PreadmissionAttachmentField = (typeof PREADMISSION_ATTACHMENT_FIELDS)[number]

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
])
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

function patientField(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function parsePatientCelular(value: unknown): string {
  const cel = patientField(value)
  const m = cel.match(/^\+(\d{1,3})([\d\s-]+)$/)
  if (m) return m[2].replace(/\D/g, '')
  return cel.replace(/^\+/, '').replace(/\D/g, '') || ''
}

interface LocationData {
  provincia: string
  distrito: string
  corregimiento: string
}

export default function PreadmissionPage() {
  const { isAuthenticated, token } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdPreadmissionId, setCreatedPreadmissionId] = useState<number | null>(null)
  const [createdQrCode, setCreatedQrCode] = useState<string | null>(null)
  const [patientFound, setPatientFound] = useState(false)
  const [searchNotice, setSearchNotice] = useState('')
  const [locations, setLocations] = useState<LocationData[]>([])
  const [nationalities, setNationalities] = useState<Array<{codigo: string, nacionalidad: string, pais: string}>>([])
  const [provincias, setProvincias] = useState<Array<{codigo: string, nombre: string}>>([])
  const [distritos, setDistritos] = useState<Array<{codigo: string, nombre: string}>>([])
  const [corregimientos, setCorregimientos] = useState<Array<{codigo: string, nombre: string}>>([])
  
  const [emailCode, setEmailCode] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [verificationHint, setVerificationHint] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [verificationSending, setVerificationSending] = useState(false)
  const [verificationConfirming, setVerificationConfirming] = useState(false)
  const [attachmentFiles, setAttachmentFiles] = useState<
    Partial<Record<PreadmissionAttachmentField, File>>
  >({})
  const attachmentFilesRef = useRef<Partial<Record<PreadmissionAttachmentField, File>>>({})
  const emailInputRef = useRef<HTMLInputElement>(null)
  const cedulaInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    registradoComo: 'paciente',
    departamento: '',
    fechaprobableatencion: '',
    pasaporte: 'C',
    cedula: '',
    name1: '',
    name2: '',
    apellido1: '',
    apellido2: '',
    sexo: 'M',
    fechanac: '',
    nacionalidad: '',
    estadocivil: '',
    tiposangre: '',
    email: '',
    celularPrefix: '507',
    celular: '',
    provincia1: '',
    distrito1: '',
    corregimiento1: '',
    direccion1: '',
    encasourgencia: '',
    relacion: '',
    email3: '',
    celular3: '',
    provincia3: '',
    distrito3: '',
    corregimiento3: '',
    direccion3: '',
    medico: '',
    doblecobertura: 'NO',
    compania1: '',
    poliza1: '',
    diagnostico: '',
    procedimientoEstudio: '',
    numerocotizacion: '',
  })

  const todayIso = useMemo(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  }, [])

  const isValidEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

  const syncEmailFromInput = (value: string) => {
    setEmailVerified(false)
    setVerificationError('')
    setError('')
    setFormData((prev) => ({ ...prev, email: value }))
  }

  const getEmailDestination = () =>
    (emailInputRef.current?.value ?? formData.email).trim().toLowerCase()

  const syncCedulaFromInput = (value: string) => {
    setSearchNotice('')
    setPatientFound(false)
    setError('')
    const normalized =
      formData.pasaporte === 'C' ? normalizeDocumentId(value, 'C') : value.replace(/\s+/g, '').trim()
    setFormData((prev) => (prev.cedula === normalized ? prev : { ...prev, cedula: normalized }))
  }

  const getCedulaValue = () => {
    const raw = (cedulaInputRef.current?.value ?? formData.cedula).trim()
    return formData.pasaporte === 'C' ? normalizeDocumentId(raw, 'C') : raw.replace(/\s+/g, '')
  }

  const canSendEmailCode = useMemo(
    () => isValidEmailAddress(formData.email) && !emailVerified && !verificationSending,
    [formData.email, emailVerified, verificationSending],
  )

  useEffect(() => {
    if (step !== 4) return
    const timer = window.setTimeout(() => {
      const autofilled = emailInputRef.current?.value?.trim()
      if (autofilled && autofilled !== formData.email) {
        syncEmailFromInput(autofilled)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [step, formData.email])

  useEffect(() => {
    if (step !== 2) return
    const timer = window.setTimeout(() => {
      const autofilled = cedulaInputRef.current?.value?.trim()
      if (autofilled && autofilled !== formData.cedula) {
        syncCedulaFromInput(autofilled)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [step, formData.cedula])

  useEffect(() => {
    if (emailVerified) {
      setError('')
      setVerificationError('')
    }
  }, [emailVerified])

  useEffect(() => {
    loadCatalogs()
  }, [])

  const loadCatalogs = async () => {
    try {
      const authToken = isAuthenticated ? (token || localStorage.getItem('token')) : null
      const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {}

      // Cargar nacionalidades (público para preadmisión sin login)
      const natResponse = await fetch('/api/catalogs/nacionalidades', { headers })
      if (natResponse.ok) {
        const nats = await natResponse.json()
        setNationalities(nats)
      }
      
      const provResponse = await fetch('/api/catalogs/provincias', { headers })
      if (provResponse.ok) {
        const provs = await provResponse.json()
        setProvincias(provs)
      }
    } catch (err) {
      console.error('Error loading catalogs:', err)
    }
  }

  const loadDistritos = async (provinciaCodigo: string, clearValues = true) => {
    if (!provinciaCodigo) {
      setDistritos([])
      setCorregimientos([])
      return
    }
    try {
      const authToken = isAuthenticated ? (token || localStorage.getItem('token')) : null
      const headers: HeadersInit = {}
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`
      const response = await fetch(`/api/catalogs/distritos?provincia=${provinciaCodigo}`, { headers })
      if (response.ok) {
        const dists = await response.json()
        setDistritos(dists)
        setCorregimientos([]) // Limpiar corregimientos cuando cambia la provincia
        if (clearValues) {
          setFormData(prev => ({ ...prev, distrito1: '', corregimiento1: '' }))
        }
      }
    } catch (err) {
      console.error('Error loading distritos:', err)
    }
  }

  const loadCorregimientos = async (distritoCodigo: string, clearValues = true) => {
    if (!distritoCodigo) {
      setCorregimientos([])
      return
    }
    try {
      const authToken = isAuthenticated ? (token || localStorage.getItem('token')) : null
      const headers: HeadersInit = {}
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`
      const response = await fetch(`/api/catalogs/corregimientos?distrito=${distritoCodigo}`, { headers })
      if (response.ok) {
        const corregs = await response.json()
        setCorregimientos(corregs)
        if (clearValues) {
          setFormData(prev => ({ ...prev, corregimiento1: '' }))
        }
      }
    } catch (err) {
      console.error('Error loading corregimientos:', err)
    }
  }

  const searchPatient = async () => {
    const cedula = getCedulaValue()
    const tipoIdentificacion = formData.pasaporte

    if (!cedula || !tipoIdentificacion) {
      setError('Por favor ingresa el tipo y número de identificación')
      return
    }

    if (cedula !== formData.cedula) {
      setFormData((prev) => ({ ...prev, cedula }))
    }

    setSearching(true)
    setError('')
    setSearchNotice('')
    setPatientFound(false)

    try {
      const response = await fetch(
        `/api/preadmission/search?cedula=${encodeURIComponent(cedula)}&tipoIdentificacion=${encodeURIComponent(tipoIdentificacion)}`,
      )

      let data: unknown = null
      try {
        data = await parseJsonResponse(response)
      } catch {
        throw new Error('No se pudo buscar el paciente: respuesta inválida del servidor')
      }

      if (!response.ok) {
        throw new Error(apiErrorMessage(data, 'No se pudo buscar el paciente'))
      }

      const patient = data as Record<string, unknown> | null
      if (patient) {
        const updatedFormData = {
          ...formData,
          cedula,
          name1: patientField(patient.name1),
          name2: patientField(patient.name2),
          apellido1: patientField(patient.apellido1),
          apellido2: patientField(patient.apellido2),
          sexo: patientField(patient.sexo, 'M'),
          fechanac: patientField(patient.fechanac),
          nacionalidad: patientField(patient.nacionalidad),
          estadocivil: patientField(patient.estadocivil),
          tiposangre: patientField(patient.tiposangre),
          email: patientField(patient.email),
          celularPrefix: patientField(patient.celularPrefix, '507'),
          celular: parsePatientCelular(patient.celular),
          provincia1: patientField(patient.provincia1),
          distrito1: patientField(patient.distrito1),
          corregimiento1: patientField(patient.corregimiento1),
          direccion1: patientField(patient.direccion1),
          encasourgencia: patientField(patient.encasourgencia),
          relacion: patientField(patient.relacion),
          email3: patientField(patient.email3),
          celular3: patientField(patient.celular3),
          provincia3: patientField(patient.provincia3),
          distrito3: patientField(patient.distrito3),
          corregimiento3: patientField(patient.corregimiento3),
          direccion3: patientField(patient.direccion3),
          doblecobertura: patientField(patient.doblecobertura, 'NO'),
          compania1: patientField(patient.compania1),
          poliza1: patientField(patient.poliza1),
          carnetseguro: patientField(patient.carnetseguro),
          certificadoSeguro: patientField(patient.certificadoSeguro),
        }
        setFormData(updatedFormData)

        if (updatedFormData.provincia1) {
          await loadDistritos(updatedFormData.provincia1, false)
          if (updatedFormData.distrito1) {
            await loadCorregimientos(updatedFormData.distrito1, false)
          }
        }

        setPatientFound(true)
      } else {
        setPatientFound(false)
        setSearchNotice(
          'No se encontraron datos previos para este documento. Puede continuar completando el formulario.',
        )
      }
    } catch (err) {
      console.error('Error searching patient:', err)
      setPatientFound(false)
      setError(fetchNetworkErrorMessage(err, 'No se pudo buscar el paciente'))
    } finally {
      setSearching(false)
    }
  }

  const handleFileSelect = (field: PreadmissionAttachmentField, file: File) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError('El archivo supera el tamaño máximo de 15 MB')
      return
    }
    const extOk = /\.(jpe?g|png|pdf)$/i.test(file.name)
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type) && !extOk) {
      setError('Formato no permitido. Use JPG, PNG o PDF.')
      return
    }
    const next = { ...attachmentFilesRef.current, [field]: file }
    attachmentFilesRef.current = next
    setAttachmentFiles(next)
    setError('')
  }

  const checkDuplicatePreadmission = async (): Promise<boolean> => {
    if (
      !formData.cedula ||
      !formData.pasaporte ||
      !formData.departamento ||
      !formData.fechaprobableatencion
    ) {
      return true
    }
    try {
      const params = new URLSearchParams({
        cedula: formData.cedula.trim(),
        pasaporte: formData.pasaporte,
        departamento: formData.departamento,
        fechaprobableatencion: formData.fechaprobableatencion.trim(),
      })
      const response = await fetch(`/api/preadmission/check-active?${params.toString()}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(apiErrorMessage(data, 'No se pudo verificar preadmisiones existentes'))
        return false
      }
      if (data.active) {
        setError(
          data.message ||
            'Ya existe una preadmisión para este servicio y fecha de atención',
        )
        return false
      }
      return true
    } catch {
      setError('No se pudo verificar preadmisiones existentes. Intente de nuevo.')
      return false
    }
  }

  const goToNextStep = async () => {
    if (step === 4) {
      const phoneOk = validatePhoneNumber(formData.celularPrefix, formData.celular)
      if (!phoneOk.valid) {
        setError(phoneOk.message || 'Número de celular inválido')
        return
      }
    }
    if (step === 5) {
      const phoneOk = validatePhoneNumber('507', formData.celular3)
      if (!phoneOk.valid) {
        setError(phoneOk.message || 'Número de emergencia inválido')
        return
      }
    }
    if (!validateStep(step)) {
      setError('Por favor completa todos los campos obligatorios')
      return
    }
    if (step === 2) {
      const ok = await checkDuplicatePreadmission()
      if (!ok) return
    }
    setStep(step + 1)
    setError('')
  }

  const requestVerification = async () => {
    setVerificationError('')
    setError('')
    setVerificationHint('')
    const destination = getEmailDestination()
    if (!isValidEmailAddress(destination)) {
      setVerificationError('Ingrese un correo electrónico válido antes de solicitar el código')
      return
    }
    if (destination !== formData.email.trim().toLowerCase()) {
      syncEmailFromInput(destination)
    }

    setVerificationSending(true)
    try {
      const response = await fetch('/api/preadmission/verify-contact/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(apiErrorMessage(data, 'No se pudo enviar el código'))
      }
      setVerificationError('')
      setError('')
      setVerificationHint(
        data.previewCode
          ? `Código de prueba (desarrollo): ${data.previewCode}`
          : 'Código enviado. Revise su bandeja de correo (y carpeta de spam).',
      )
    } catch (err: unknown) {
      setVerificationError(fetchNetworkErrorMessage(err, 'No se pudo enviar el código'))
    } finally {
      setVerificationSending(false)
    }
  }

  const confirmVerification = async () => {
    setVerificationError('')
    setError('')
    const destination = getEmailDestination()
    if (!isValidEmailAddress(destination)) {
      setVerificationError('Ingrese un correo electrónico válido')
      return
    }
    if (!emailCode.trim()) {
      setVerificationError('Ingrese el código recibido por correo')
      return
    }

    setVerificationConfirming(true)
    try {
      const response = await fetch('/api/preadmission/verify-contact/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, code: emailCode.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(apiErrorMessage(data, 'Código inválido o expirado'))
      }
      setEmailVerified(true)
      setVerificationError('')
      setError('')
      setVerificationHint('Correo verificado correctamente')
    } catch (err: unknown) {
      setVerificationError(fetchNetworkErrorMessage(err, 'No se pudo confirmar el correo'))
    } finally {
      setVerificationConfirming(false)
    }
  }

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return !!(formData.departamento && formData.fechaprobableatencion && isValidDdMmYyyy(formData.fechaprobableatencion))
      case 2:
        return !!(formData.registradoComo && formData.pasaporte && formData.cedula)
      case 3:
        return !!(formData.name1 && formData.apellido1 && 
                  formData.fechanac && isValidDdMmYyyy(formData.fechanac) && formData.sexo && formData.nacionalidad && 
                  formData.estadocivil && formData.tiposangre)
      case 4:
        return !!(formData.email && formData.celular && formData.provincia1 &&
                  formData.distrito1 && formData.corregimiento1 && formData.direccion1 &&
                  emailVerified)
      case 5:
        return !!(formData.encasourgencia && formData.relacion &&
                  formData.email3 && formData.celular3)
      case 6:
        if (formData.doblecobertura === 'SI') {
          return !!(formData.compania1 && formData.poliza1)
        }
        return true
      case 7:
        return !!(attachmentFilesRef.current.cedulaimagen || attachmentFiles.cedulaimagen)
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(7)) {
      setError('Por favor completa todos los campos obligatorios')
      return
    }
    if (!isValidDdMmYyyy(formData.fechaprobableatencion) || !isValidDdMmYyyy(formData.fechanac)) {
      setError('Las fechas deben estar en formato DD/MM/YYYY y ser válidas')
      return
    }

    const duplicateOk = await checkDuplicatePreadmission()
    if (!duplicateOk) return

    setLoading(true)
    setError('')

    try {
      let totalBytes = 0
      for (const field of PREADMISSION_ATTACHMENT_FIELDS) {
        const file = attachmentFilesRef.current[field] || attachmentFiles[field]
        if (file) {
          if (file.size > MAX_ATTACHMENT_BYTES) {
            setError(`El archivo "${file.name}" supera el límite de 15 MB`)
            return
          }
          totalBytes += file.size
        }
      }
      if (totalBytes > MAX_ATTACHMENT_BYTES * 4) {
        setError('El tamaño total de los adjuntos es muy grande. Reduzca imágenes o envíe menos archivos.')
        return
      }

      const body = new FormData()
      body.append(
        'data',
        JSON.stringify({
          ...formData,
          celularPrefix: formData.celularPrefix || '507',
        }),
      )
      for (const field of PREADMISSION_ATTACHMENT_FIELDS) {
        const file = attachmentFilesRef.current[field] || attachmentFiles[field]
        if (file) body.append(field, file, file.name)
      }

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 180_000)

      const response = await fetch('/api/preadmission/public', {
        method: 'POST',
        body,
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeoutId))

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(apiErrorMessage(data, 'Error al enviar preadmisión'))
      }

      const data = await response.json()
      setCreatedPreadmissionId(data.id)
      setCreatedQrCode(data.qrCode ?? null)
      setSuccess(true)
    } catch (err: unknown) {
      setError(fetchNetworkErrorMessage(err, 'No se pudo enviar la preadmisión'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Preadmisión Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Tu preadmisión ha sido enviada exitosamente. Recibirás una notificación cuando sea revisada.
          </p>
          
          {/* QR Code para presentar al llegar al hospital */}
          {createdPreadmissionId && (
            <div className="mb-6 flex flex-col items-center">
              <p className="text-sm text-gray-700 mb-3 font-medium">
                Presente este QR al llegar al hospital para registrar su llegada:
              </p>
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <QRCodeSVG
                  value={createdQrCode || String(createdPreadmissionId)}
                  size={200}
                  level="M"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Código: {createdQrCode || createdPreadmissionId} (escanéelo en recepción o kiosco)
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/"
              className="bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 inline-block border border-gray-300"
            >
              Ir al inicio
            </Link>
            <Link
              href="/dashboard"
              className="bg-hospital-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-hospital-blue-dark inline-block"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalSteps = 8

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-4 sm:py-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 w-full min-w-0 box-border">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
            ← Volver al inicio
          </Link>
          <HospitalLogo href="/" width={160} height={40} className="h-10 w-auto object-contain" />
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 max-w-full min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Preadmisión Digital</h1>
          <p className="text-gray-600 mb-4 sm:mb-8 text-sm sm:text-base">Completa los siguientes pasos para tu preadmisión</p>

          {/* Progress Steps: en móvil texto + barra; en desktop círculos */}
          <div className="mb-6 sm:mb-8">
            <div className="sm:hidden">
              <p className="text-sm font-medium text-gray-700 mb-2">Paso {step} de {totalSteps}</p>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-hospital-blue rounded-full transition-all duration-300"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>
            <div className="hidden sm:flex justify-between items-center min-w-0">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <div key={s} className="flex items-center flex-1 min-w-0">
                  <div
                    className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-semibold text-sm lg:text-base shrink-0 ${
                      step >= s
                        ? 'bg-hospital-blue text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 8 && (
                    <div
                      className={`flex-1 h-1 mx-1 min-w-0 ${
                        step > s ? 'bg-hospital-blue' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {patientFound && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              ✓ Paciente encontrado. Los datos han sido pre-llenados. Puedes modificarlos si es necesario.
            </div>
          )}

          {/* Step 1: Departamento y Fecha */}
          {step === 1 && (
            <div className="space-y-6 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Paso 1: Área y Fecha</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento *
                </label>
                <select
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="RAD">Radiología</option>
                  <option value="LAB">Laboratorio</option>
                </select>
              </div>
              <DdMmYyyyDateField
                label="Fecha Probable de Atención *"
                value={formData.fechaprobableatencion}
                onChange={(v) => setFormData({ ...formData, fechaprobableatencion: v })}
                minIso={todayIso}
                required
              />
            </div>
          )}

          {/* Step 2: Identificación y Búsqueda */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Paso 2: Identificación del Paciente</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Quién completa el registro? *
                </label>
                <select
                  value={formData.registradoComo}
                  onChange={(e) => setFormData({ ...formData, registradoComo: e.target.value })}
                  className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  required
                >
                  <option value="paciente">Paciente</option>
                  <option value="acompanante">Acompañante</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Identificación *
                  </label>
                  <select
                    value={formData.pasaporte}
                    onChange={(e) => {
                      setSearchNotice('')
                      setPatientFound(false)
                      setFormData({ ...formData, pasaporte: e.target.value, cedula: '' })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    <option value="C">Cédula</option>
                    <option value="P">Pasaporte</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de {formData.pasaporte === 'C' ? 'Cédula' : 'Pasaporte'} *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      ref={cedulaInputRef}
                      type="text"
                      value={formData.cedula}
                      onChange={(e) => syncCedulaFromInput(e.target.value)}
                      onInput={(e) => syncCedulaFromInput((e.target as HTMLInputElement).value)}
                      onBlur={(e) => syncCedulaFromInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void searchPatient()
                        }
                      }}
                      className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      placeholder={formData.pasaporte === 'C' ? '0-000-000' : 'Número de pasaporte'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => void searchPatient()}
                      disabled={searching || !formData.cedula.trim()}
                      className="w-full sm:w-auto px-6 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  {searchNotice && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded text-sm">
                      {searchNotice}
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Busca si el paciente ya tiene datos registrados en el sistema
                  </p>
                </div>
              </div>
              {formData.pasaporte === 'C' && (
                <CedulaQrCapture
                  onParsed={(_, parsed) => {
                    setError('')
                    setFormData((prev) =>
                      mapParsedToPreadmissionFields(prev, parsed, { nationalities }),
                    )
                  }}
                  onError={(message) => setError(message)}
                />
              )}
            </div>
          )}

          {/* Step 3: Datos Personales */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Paso 3: Datos Personales</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primer Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name1}
                    onChange={(e) => setFormData({ ...formData, name1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Segundo Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.name2}
                    onChange={(e) => setFormData({ ...formData, name2: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primer Apellido *
                  </label>
                  <input
                    type="text"
                    value={formData.apellido1}
                    onChange={(e) => setFormData({ ...formData, apellido1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Segundo Apellido
                  </label>
                  <input
                    type="text"
                    value={formData.apellido2}
                    onChange={(e) => setFormData({ ...formData, apellido2: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sexo *
                  </label>
                  <select
                    value={formData.sexo}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <DdMmYyyyDateField
                  label="Fecha de Nacimiento *"
                  value={formData.fechanac}
                  onChange={(v) => setFormData({ ...formData, fechanac: v })}
                  maxIso={todayIso}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nacionalidad *
                  </label>
                  <select
                    value={formData.nacionalidad}
                    onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seleccione...</option>
                    {nationalities.map((nat) => (
                      <option key={nat.codigo} value={nat.codigo}>
                        {nat.nacionalidad} - {nat.pais}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado Civil *
                  </label>
                  <select
                    value={formData.estadocivil}
                    onChange={(e) => setFormData({ ...formData, estadocivil: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seleccione...</option>
                    <option value="ST">Soltero</option>
                    <option value="CS">Casado</option>
                    <option value="DV">Divorciado</option>
                    <option value="UN">Unión Libre</option>
                    <option value="SP">Separado</option>
                    <option value="VD">Viudo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Sangre *
                  </label>
                  <select
                    value={formData.tiposangre}
                    onChange={(e) => setFormData({ ...formData, tiposangre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seleccione...</option>
                    <option value="1">A+</option>
                    <option value="2">A-</option>
                    <option value="3">A1+</option>
                    <option value="4">AB+</option>
                    <option value="5">AB-</option>
                    <option value="6">B+</option>
                    <option value="7">B-</option>
                    <option value="8">O+</option>
                    <option value="9">O-</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Contacto y Dirección */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Paso 4: Contacto y Dirección</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={formData.email}
                    autoComplete="email"
                    onChange={(e) => syncEmailFromInput(e.target.value)}
                    onInput={(e) => syncEmailFromInput((e.target as HTMLInputElement).value)}
                    onBlur={(e) => syncEmailFromInput(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  />
                </div>
                <div className="md:col-span-2 border border-dashed border-gray-300 rounded-lg p-4 bg-blue-50/60 space-y-3">
                  <p className="text-sm text-gray-700 font-medium">Verificación de correo electrónico *</p>
                  <p className="text-xs text-gray-600">
                    Ingrese su correo arriba y solicite el código. Debe verificar el correo para continuar al siguiente paso.
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => void requestVerification()}
                      disabled={!canSendEmailCode}
                      className="px-4 py-2 bg-hospital-blue text-white rounded-lg text-sm font-medium hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verificationSending ? 'Enviando código...' : 'Enviar código al correo'}
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={emailCode}
                      onChange={(e) => {
                        setVerificationError('')
                        setError('')
                        setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }}
                      placeholder="Código de 6 dígitos"
                      disabled={emailVerified}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white disabled:bg-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => void confirmVerification()}
                      disabled={emailVerified || verificationConfirming || !emailCode.trim()}
                      className="px-4 py-2 border border-hospital-blue text-hospital-blue rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verificationConfirming ? 'Confirmando...' : 'Confirmar correo'}
                    </button>
                    {emailVerified && <span className="text-green-700 text-sm font-medium">✓ Correo verificado</span>}
                  </div>
                  {!canSendEmailCode && !emailVerified && !verificationSending && (
                    <p className="text-xs text-amber-700">
                      {formData.email.trim()
                        ? 'El correo ingresado no tiene un formato válido.'
                        : 'Escriba su correo en el campo de arriba para habilitar el envío del código.'}
                    </p>
                  )}
                  {verificationError && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                      {verificationError}
                    </p>
                  )}
                  {verificationHint && !verificationError && (
                    <p className={`text-xs font-medium ${emailVerified ? 'text-green-700' : 'text-gray-700'}`}>
                      {verificationHint}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Celular * (prefijo país + número)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={formData.celularPrefix}
                      onChange={(e) => setFormData({ ...formData, celularPrefix: e.target.value })}
                      className="sm:w-40 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    >
                      <option value="507">+507 Panamá</option>
                      <option value="506">+506 Costa Rica</option>
                      <option value="57">+57 Colombia</option>
                      <option value="1">+1 USA/CAN</option>
                    </select>
                    <input
                      type="tel"
                      value={formData.celular}
                      onChange={(e) => {
                        setFormData({ ...formData, celular: e.target.value.replace(/[^\d\s-]/g, '') })
                      }}
                      className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      placeholder="Ej: 6123-4567"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provincia *
                  </label>
                  <select
                    value={formData.provincia1}
                    onChange={async (e) => {
                      const nuevaProvincia = e.target.value
                      setFormData({ ...formData, provincia1: nuevaProvincia, distrito1: '', corregimiento1: '' })
                      await loadDistritos(nuevaProvincia, true)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seleccione una provincia...</option>
                    {provincias.map((prov) => (
                      <option key={prov.codigo} value={prov.codigo}>
                        {prov.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distrito *
                  </label>
                  <select
                    value={formData.distrito1}
                    onChange={async (e) => {
                      const nuevoDistrito = e.target.value
                      setFormData({ ...formData, distrito1: nuevoDistrito, corregimiento1: '' })
                      await loadCorregimientos(nuevoDistrito, true)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    disabled={!formData.provincia1}
                    required
                  >
                    <option value="">Seleccione un distrito...</option>
                    {distritos.map((dist) => (
                      <option key={dist.codigo} value={dist.codigo}>
                        {dist.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Corregimiento *
                  </label>
                  <select
                    value={formData.corregimiento1}
                    onChange={(e) => setFormData({ ...formData, corregimiento1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    disabled={!formData.distrito1}
                    required
                  >
                    <option value="">Seleccione un corregimiento...</option>
                    {corregimientos.map((correg) => (
                      <option key={correg.codigo} value={correg.codigo}>
                        {correg.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={formData.direccion1}
                    maxLength={200}
                    onChange={(e) => setFormData({ ...formData, direccion1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.direccion1.length}/200 caracteres</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Contacto de Urgencia */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Paso 5: Contacto de Urgencia</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Contacto *
                  </label>
                  <input
                    type="text"
                    value={formData.encasourgencia}
                    onChange={(e) => setFormData({ ...formData, encasourgencia: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relación *
                  </label>
                  <input
                    type="text"
                    value={formData.relacion}
                    onChange={(e) => setFormData({ ...formData, relacion: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    placeholder="Ej: HIJA, ESPOSO, etc."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email del Contacto *
                  </label>
                  <input
                    type="email"
                    value={formData.email3}
                    onChange={(e) => setFormData({ ...formData, email3: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Celular del Contacto *
                  </label>
                  <input
                    type="tel"
                    value={formData.celular3}
                    onChange={(e) => setFormData({ ...formData, celular3: e.target.value.replace(/[^\d\s-]/g, '') })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Seguro/Cobertura */}
          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Paso 6: Seguro y Cobertura</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Mantiene seguro? *
                </label>
                <select
                  value={formData.doblecobertura}
                  onChange={(e) => {
                    const v = e.target.value
                    setFormData({
                      ...formData,
                      doblecobertura: v,
                      ...(v === 'NO'
                        ? { compania1: '', poliza1: '', carnetseguro: '', certificadoSeguro: '' }
                        : {}),
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  required
                >
                  <option value="NO">No</option>
                  <option value="SI">Sí</option>
                </select>
                {formData.doblecobertura === 'NO' && (
                  <p className="text-sm text-gray-600 mt-2">
                    Se registrará automáticamente como <strong>PACIENTE PRIVADO</strong> (sin seguro).
                  </p>
                )}
              </div>
              {formData.doblecobertura === 'SI' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compañía de Seguro *
                    </label>
                    <input
                      type="text"
                      value={formData.compania1}
                      onChange={(e) => setFormData({ ...formData, compania1: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Póliza *
                    </label>
                    <input
                      type="text"
                      value={formData.poliza1}
                      onChange={(e) => setFormData({ ...formData, poliza1: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      required
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Médico (opcional)
                </label>
                <input
                  type="text"
                  value={formData.medico}
                  onChange={(e) => setFormData({ ...formData, medico: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Procedimiento / estudio a realizar
                </label>
                <textarea
                  value={formData.procedimientoEstudio}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      procedimientoEstudio: e.target.value,
                      diagnostico: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 7: Adjuntos */}
          {step === 7 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Paso 7: Documentos Adjuntos</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cédula/Pasaporte (Imagen) *
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png,.pdf,application/pdf"
                    capture="environment"
                    key={`cedulaimagen-${attachmentFiles.cedulaimagen?.name ?? 'empty'}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect('cedulaimagen', file)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    required
                  />
                  {attachmentFiles.cedulaimagen && (
                    <p className="text-xs text-green-700 mt-1">
                      Archivo: {attachmentFiles.cedulaimagen.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Puede usar la cámara del dispositivo o subir un archivo PNG, JPG o PDF.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Orden Médica (Imagen) — opcional
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png,.pdf,application/pdf"
                    key={`ordenimagen-${attachmentFiles.ordenimagen?.name ?? 'empty'}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect('ordenimagen', file)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  />
                  {attachmentFiles.ordenimagen && (
                    <p className="text-xs text-green-700 mt-1">
                      Archivo: {attachmentFiles.ordenimagen.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preautorización (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png,.pdf,application/pdf"
                    key={`preautorizacion-${attachmentFiles.preautorizacion?.name ?? 'empty'}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect('preautorizacion', file)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  />
                  {attachmentFiles.preautorizacion && (
                    <p className="text-xs text-green-700 mt-1">
                      Archivo: {attachmentFiles.preautorizacion.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carné de seguro {formData.doblecobertura === 'SI' ? '*' : '(solo si tiene seguro)'}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png,.pdf,application/pdf"
                    key={`carnetseguro-${attachmentFiles.carnetseguro?.name ?? 'empty'}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect('carnetseguro', file)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  />
                  {attachmentFiles.carnetseguro && (
                    <p className="text-xs text-green-700 mt-1">
                      Archivo: {attachmentFiles.carnetseguro.name}
                    </p>
                  )}
                </div>
                {formData.doblecobertura === 'SI' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificado de seguro (opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png,.pdf,application/pdf"
                      key={`certificadoSeguro-${attachmentFiles.certificadoSeguro?.name ?? 'empty'}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelect('certificadoSeguro', file)
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    />
                    {attachmentFiles.certificadoSeguro && (
                      <p className="text-xs text-green-700 mt-1">
                        Archivo: {attachmentFiles.certificadoSeguro.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 8: Confirmación */}
          {step === 8 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Paso 8: Confirmación</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-4">
                  Por favor revisa que toda la información sea correcta antes de enviar.
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Departamento:</strong> {formData.departamento}</p>
                  <p><strong>Paciente:</strong> {formData.name1} {formData.apellido1}</p>
                  <p><strong>Cédula:</strong> {formData.cedula}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <div className="pt-2 border-t border-gray-200 mt-2">
                    <p className="font-medium mb-1">Documentos adjuntos:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {PREADMISSION_ATTACHMENT_FIELDS.map((field) => {
                        const file = attachmentFilesRef.current[field] || attachmentFiles[field]
                        if (!file) return null
                        return <li key={field}>{file.name}</li>
                      })}
                      {!PREADMISSION_ATTACHMENT_FIELDS.some(
                        (field) => attachmentFilesRef.current[field] || attachmentFiles[field],
                      ) && <li className="text-red-600">Falta la imagen de cédula</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons: en móvil apilados y ancho completo para no cortarse */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="w-full sm:w-auto px-6 py-3 sm:py-2 border border-gray-300 rounded-lg text-gray-900 bg-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Anterior
            </button>
            {step < 8 ? (
              <button
                onClick={() => void goToNextStep()}
                className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark shrink-0"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 shrink-0"
              >
                {loading ? 'Enviando...' : 'Enviar Preadmisión'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
