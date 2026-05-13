'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { CedulaQrParsed, parseCedulaQrRaw } from '@/lib/cedulaQr'

type CedulaQrCaptureProps = {
  onParsed: (raw: string, parsed: CedulaQrParsed) => void
  onError?: (message: string) => void
  disabled?: boolean
}

export function CedulaQrCapture({ onParsed, onError, disabled = false }: CedulaQrCaptureProps) {
  const reactId = useId().replace(/:/g, '')
  const scannerContainerId = `cedula-qr-${reactId}`
  const qrScannerRef = useRef<Html5Qrcode | null>(null)
  const [qrRaw, setQrRaw] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [applying, setApplying] = useState(false)

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

  const closeScanner = async () => {
    const scanner = qrScannerRef.current
    qrScannerRef.current = null
    if (scanner) {
      try {
        await scanner.stop()
      } catch {
        // ignorar si ya está detenido
      }
    }
    setShowScanner(false)
    setScanError(null)
    setScanning(false)
  }

  useEffect(() => {
    if (!showScanner) return
    setScanError(null)
    setScanning(true)
    let cancelled = false
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(scannerContainerId)
        qrScannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            if (cancelled) return
            scanner
              .stop()
              .then(() => {
                qrScannerRef.current = null
                if (!cancelled) {
                  setShowScanner(false)
                  setScanning(false)
                  void applyRaw(decodedText)
                }
              })
              .catch(() => {})
          },
          () => {},
        )
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
        setScanError(msg)
        setScanning(false)
        qrScannerRef.current = null
      }
    }
    const timer = setTimeout(startScanner, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
      const scanner = qrScannerRef.current
      if (scanner) {
        qrScannerRef.current = null
        scanner.stop().catch(() => {})
      }
    }
  }, [showScanner, scannerContainerId, applyRaw])

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700">Lectura automática de cédula</p>
        <p className="text-xs text-gray-500 mt-1">
          Escanee el QR del reverso de la cédula panameña o pegue el texto leído por un lector externo.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          disabled={disabled || applying}
          className="px-4 py-2 bg-hospital-blue text-white rounded-lg hover:bg-hospital-blue-dark disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Escanear con cámara
        </button>
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

      {showScanner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Escanear QR de cédula</h3>
            <p className="text-sm text-gray-600 mb-4">
              Apunte la cámara al QR de datos del reverso de la cédula. En móviles se usará la cámara trasera si está disponible.
            </p>
            <div id={scannerContainerId} className="min-h-[250px] w-full rounded-lg overflow-hidden bg-gray-100" />
            {scanError && <p className="mt-3 text-sm text-red-600">{scanError}</p>}
            {scanning && !scanError && <p className="mt-2 text-sm text-gray-500">Iniciando cámara...</p>}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void closeScanner()}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
