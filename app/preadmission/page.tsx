'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { formatDateInput, isValidDdMmYyyy } from '@/lib/dateUtils'

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
  const [patientFound, setPatientFound] = useState(false)
  const [locations, setLocations] = useState<LocationData[]>([])
  const [nationalities, setNationalities] = useState<Array<{codigo: string, nacionalidad: string, pais: string}>>([])
  const [provincias, setProvincias] = useState<Array<{codigo: string, nombre: string}>>([])
  const [distritos, setDistritos] = useState<Array<{codigo: string, nombre: string}>>([])
  const [corregimientos, setCorregimientos] = useState<Array<{codigo: string, nombre: string}>>([])
  
  const [formData, setFormData] = useState({
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
    numerocotizacion: '',
    cedulaimagen: '',
    ordenimagen: '',
    preautorizacion: '',
    carnetseguro: '',
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    loadCatalogs()
  }, [isAuthenticated])

  const loadCatalogs = async () => {
    try {
      const authToken = token || localStorage.getItem('token')
      
      // Cargar nacionalidades
      const natResponse = await fetch('/api/catalogs/nacionalidades', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
      if (natResponse.ok) {
        const nats = await natResponse.json()
        setNationalities(nats)
      }
      
      // Cargar provincias
      const provResponse = await fetch('/api/catalogs/provincias', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
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
      const authToken = token || localStorage.getItem('token')
      const response = await fetch(`/api/catalogs/distritos?provincia=${provinciaCodigo}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
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
      const authToken = token || localStorage.getItem('token')
      const response = await fetch(`/api/catalogs/corregimientos?distrito=${distritoCodigo}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
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
    if (!formData.cedula || !formData.pasaporte) {
      setError('Por favor ingresa el tipo y número de identificación')
      return
    }

    setSearching(true)
    setError('')
    setPatientFound(false)

    try {
      const authToken = token || localStorage.getItem('token')
      const response = await fetch(
        `/api/preadmission/search?cedula=${formData.cedula}&tipoIdentificacion=${formData.pasaporte}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      )

      if (response.ok) {
        const patient = await response.json()
        if (patient) {
          // Pre-llenar datos del paciente encontrado
          const updatedFormData = {
            ...formData,
            name1: patient.name1 || '',
            name2: patient.name2 || '',
            apellido1: patient.apellido1 || '',
            apellido2: patient.apellido2 || '',
            sexo: patient.sexo || 'M',
            fechanac: patient.fechanac || '',
            nacionalidad: patient.nacionalidad || '',
            estadocivil: patient.estadocivil || '',
            tiposangre: patient.tiposangre || '',
            email: patient.email || '',
            celular: patient.celular || '',
            provincia1: patient.provincia1 || '',
            distrito1: patient.distrito1 || '',
            corregimiento1: patient.corregimiento1 || '',
            direccion1: patient.direccion1 || '',
            encasourgencia: patient.encasourgencia || '',
            relacion: patient.relacion || '',
            email3: patient.email3 || '',
            celular3: patient.celular3 || '',
            provincia3: patient.provincia3 || '',
            distrito3: patient.distrito3 || '',
            corregimiento3: patient.corregimiento3 || '',
            direccion3: patient.direccion3 || '',
            doblecobertura: patient.doblecobertura || 'NO',
            compania1: patient.compania1 || '',
            poliza1: patient.poliza1 || '',
          }
          setFormData(updatedFormData)
          
          // Cargar distritos y corregimientos si hay provincia y distrito
          if (updatedFormData.provincia1) {
            await loadDistritos(updatedFormData.provincia1, false)
            if (updatedFormData.distrito1) {
              await loadCorregimientos(updatedFormData.distrito1, false)
            }
          }
          
          setPatientFound(true)
        } else {
          setPatientFound(false)
        }
      }
    } catch (err) {
      console.error('Error searching patient:', err)
      setPatientFound(false)
    } finally {
      setSearching(false)
    }
  }

  const compressImage = (file: File, maxWidth: number = 1440, maxHeight: number = 1080, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Si no es una imagen, convertir directamente a base64 sin comprimir
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Calcular nuevas dimensiones manteniendo la proporción
          let width = img.width
          let height = img.height

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width
              width = maxWidth
            } else {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          // Crear canvas y comprimir
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          
          // Convertir a base64 con compresión
          const compressedBase64 = canvas.toDataURL(file.type, quality)
          resolve(compressedBase64)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileUpload = async (field: string, file: File) => {
    try {
      // Comprimir imagen antes de convertir a base64
      const compressedBase64 = await compressImage(file)
      setFormData(prev => ({ ...prev, [field]: compressedBase64 }))
    } catch (err) {
      console.error('Error al procesar imagen:', err)
      setError('Error al procesar la imagen. Por favor intenta con otra imagen.')
    }
  }

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return !!(formData.departamento && formData.fechaprobableatencion && isValidDdMmYyyy(formData.fechaprobableatencion))
      case 2:
        return !!(formData.pasaporte && formData.cedula)
      case 3:
        return !!(formData.name1 && formData.apellido1 && 
                  formData.fechanac && isValidDdMmYyyy(formData.fechanac) && formData.sexo && formData.nacionalidad && 
                  formData.estadocivil && formData.tiposangre)
      case 4:
        return !!(formData.email && formData.celular && formData.provincia1 && 
                  formData.distrito1 && formData.corregimiento1 && formData.direccion1)
      case 5:
        return !!(formData.encasourgencia && formData.relacion && 
                  formData.email3 && formData.celular3)
      case 6:
        if (formData.doblecobertura === 'SI') {
          return !!(formData.compania1 && formData.poliza1)
        }
        return true
      case 7:
        return !!(formData.cedulaimagen && formData.ordenimagen)
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

    setLoading(true)
    setError('')

    try {
      const authToken = token || localStorage.getItem('token')
      const response = await fetch('/api/preadmission/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al enviar preadmisión')
      }

      const data = await response.json()
      setCreatedPreadmissionId(data.id)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
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
                <QRCodeSVG value={String(createdPreadmissionId)} size={200} level="M" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ID: {createdPreadmissionId}
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
        <div className="mb-4">
          <Link href="/" className="text-hospital-blue hover:text-hospital-blue-dark hover:underline text-sm font-medium inline-flex items-center gap-1">
            ← Volver al inicio
          </Link>
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
              <h2 className="text-lg sm:text-xl font-semibold">Paso 1: Área y Fecha</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento *
                </label>
                <select
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="RAD">Radiología</option>
                  <option value="LAB">Laboratorio</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Probable de Atención * (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={formData.fechaprobableatencion}
                  onChange={(e) => setFormData({ ...formData, fechaprobableatencion: formatDateInput(e.target.value) })}
                  placeholder="dd/mm/yyyy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  maxLength={10}
                  required
                />
              </div>
            </div>
          )}

          {/* Step 2: Identificación y Búsqueda */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold">Paso 2: Identificación del Paciente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Identificación *
                  </label>
                  <select
                    value={formData.pasaporte}
                    onChange={(e) => setFormData({ ...formData, pasaporte: e.target.value, cedula: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                      type="text"
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                      className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder={formData.pasaporte === 'C' ? '0-000-000' : 'Número de pasaporte'}
                      required
                    />
                    <button
                      type="button"
                      onClick={searchPatient}
                      disabled={searching || !formData.cedula}
                      className="w-full sm:w-auto px-6 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Busca si el paciente ya tiene datos registrados en el sistema
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Datos Personales */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold">Paso 3: Datos Personales</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primer Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name1}
                    onChange={(e) => setFormData({ ...formData, name1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sexo *
                  </label>
                  <select
                    value={formData.sexo}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Nacimiento * (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    value={formData.fechanac}
                    onChange={(e) => setFormData({ ...formData, fechanac: formatDateInput(e.target.value) })}
                    placeholder="dd/mm/yyyy"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    maxLength={10}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nacionalidad *
                  </label>
                  <select
                    value={formData.nacionalidad}
                    onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
              <h2 className="text-lg sm:text-xl font-semibold">Paso 4: Contacto y Dirección</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Celular *
                  </label>
                  <input
                    type="tel"
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    onChange={(e) => setFormData({ ...formData, direccion1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Contacto de Urgencia */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold">Paso 5: Contacto de Urgencia</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Contacto *
                  </label>
                  <input
                    type="text"
                    value={formData.encasourgencia}
                    onChange={(e) => setFormData({ ...formData, encasourgencia: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                    onChange={(e) => setFormData({ ...formData, celular3: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Seguro/Cobertura */}
          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold">Paso 6: Seguro y Cobertura</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Tiene Seguro Privado? *
                </label>
                <select
                  value={formData.doblecobertura}
                  onChange={(e) => setFormData({ ...formData, doblecobertura: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="NO">No</option>
                  <option value="SI">Sí</option>
                </select>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnóstico (opcional)
                </label>
                <textarea
                  value={formData.diagnostico}
                  onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 7: Adjuntos */}
          {step === 7 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold">Paso 7: Documentos Adjuntos</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cédula/Pasaporte (Imagen) *
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload('cedulaimagen', file)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Orden Médica (Imagen) *
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload('ordenimagen', file)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preautorización (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload('preautorizacion', file)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carnet de Seguro (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload('carnetseguro', file)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Confirmación */}
          {step === 8 && (
            <div className="space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold">Paso 8: Confirmación</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-4">
                  Por favor revisa que toda la información sea correcta antes de enviar.
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Departamento:</strong> {formData.departamento}</p>
                  <p><strong>Paciente:</strong> {formData.name1} {formData.apellido1}</p>
                  <p><strong>Cédula:</strong> {formData.cedula}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons: en móvil apilados y ancho completo para no cortarse */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="w-full sm:w-auto px-6 py-3 sm:py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Anterior
            </button>
            {step < 8 ? (
              <button
                onClick={() => {
                  if (validateStep(step)) {
                    setStep(step + 1)
                    setError('')
                  } else {
                    setError('Por favor completa todos los campos obligatorios')
                  }
                }}
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
