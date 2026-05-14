'use client'

import { useCallback, useId, useRef, useState } from 'react'
import { decodeQrFromImageFile } from '@/lib/html5QrcodeScan'
import { CedulaQrParsed, parseCedulaQrRaw } from '@/lib/cedulaQr'
import { LiveQrScannerModal } from '@/app/components/LiveQrScannerModal'

type CedulaQrCaptureProps = {
  onParsed: (raw: string, parsed: CedulaQrParsed) => void
  onError?: (message: string) => void
  disabled?: boolean
}

export function CedulaQrCapture({ onParsed, onError, disabled = false }: CedulaQrCaptureProps) {
  const reactId = useId().replace(/:/g, '')
  const scannerContainerId = `cedula-qr-${reactId}`
  const fileScanElementId = `cedula-qr-file-${reactId}`
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [qrRaw, setQrRaw] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [applying, setApplying] = useState(false)
  const [fileScanning, setFileScanning] = useState(false)

  const reportError = (message: string) => {
    onError?.(message)
  }

  const applyRaw = useCallback(async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      reportError('Escanee o pegue el contenido del QR de la cédula')
      return
    }
    setApplying(true)
    try {
      const parsed = await parseCedulaQrRaw(trimmed)
      if (!parsed.cedula && !parsed.name1 && !parsed.nombres && !parsed.apellidos) {
        reportError('No se reconocieron datos del QR. Complete los campos manualmente.')
        return
      }
      setQrRaw(trimmed)
      onParsed(trimmed, parsed)
    } catch {
      reportError('No se pudo interpretar el QR. Complete los datos manualmente.')
    } finally {
      setApplying(false)
    }
  }, [onParsed, onError])

  const onLiveQrDecoded = useCallback(
    (decodedText: string) => {
      setShowScanner(false)
      void applyRaw(decodedText)
    },
    [applyRaw],
  )

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || disabled) return
    setFileScanning(true)
    try {
      const decoded = await decodeQrFromImageFile(fileScanElementId, file)
      await applyRaw(decoded)
    } catch {
      reportError(
        'No se leyó ningún QR en la imagen. Use buena luz, encuadre solo el QR o pegue el texto manualmente.',
      )
    } finally {
      setFileScanning(false)
    }
  }

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 space-y-3">
      {/* Nodo oculto requerido por html5-qrcode.scanFile */}
      <div id={fileScanElementId} className="sr-only" aria-hidden />

      <div>
        <p className="text-sm font-medium text-gray-700">Lectura automática de cédula</p>
        <p className="text-xs text-gray-500 mt-1">
          Escanee el QR del reverso de la cédula o carné de residente, o pegue el texto que lea la cámara del teléfono.
          Si la cámara en vivo falla, use una foto nítida del QR.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          disabled={disabled || applying || fileScanning}
          className="px-4 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Escanear con cámara
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || applying || fileScanning}
          className="px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {fileScanning ? 'Leyendo imagen…' : 'Elegir foto del QR'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(ev) => void onPickImage(ev)}
        />
        <button
          type="button"
          onClick={() => void applyRaw(qrRaw)}
          disabled={disabled || applying || !qrRaw.trim()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {applying ? 'Aplicando...' : 'Aplicar datos del QR'}
        </button>
      </div>
      <textarea
        value={qrRaw}
        onChange={(e) => setQrRaw(e.target.value)}
        rows={2}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
        placeholder="Pegar contenido del QR…"
      />

      <LiveQrScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        containerId={scannerContainerId}
        onDecoded={onLiveQrDecoded}
        title="Escanear QR de cédula"
        description={
          <p>
            Mantenga el código dentro del recuadro, con buena luz y sin reflejos. Use el ícono de cámaras abajo a la
            derecha si necesita la cámara trasera. Acérquese si el QR es pequeño (cédulas y carnés de residente suelen
            ser densos).
          </p>
        }
      />
    </div>
  )
}
