'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import { SwitchCamera } from 'lucide-react'
import {
  getQrCameraFlipConstraints,
  startLiveQrScanner,
  startLiveQrScannerWithCamera,
} from '@/lib/html5QrcodeScan'

type LiveQrScannerModalProps = {
  open: boolean
  onClose: () => void
  containerId: string
  onDecoded: (text: string) => void
  title: string
  description?: ReactNode
  /** Ancho máximo del panel (Tailwind), p. ej. max-w-lg */
  panelClassName?: string
}

/**
 * Modal con vista previa html5-qrcode. En móviles con varias cámaras muestra un botón para alternar.
 */
export function LiveQrScannerModal({
  open,
  onClose,
  containerId,
  onDecoded,
  title,
  description,
  panelClassName = 'max-w-lg',
}: LiveQrScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onDecodedRef = useRef(onDecoded)
  onDecodedRef.current = onDecoded
  const flipConstraintsRef = useRef<Array<string | MediaTrackConstraints> | null>(null)
  const cameraSlotRef = useRef(0)
  const [flipNonce, setFlipNonce] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [canFlipCamera, setCanFlipCamera] = useState(false)

  const stopAndClear = useCallback(async (scanner: Html5Qrcode | null) => {
    if (!scanner) return
    try {
      await scanner.stop()
    } catch {
      /* */
    }
    try {
      scanner.clear()
    } catch {
      /* */
    }
  }, [])

  useEffect(() => {
    if (!open) {
      flipConstraintsRef.current = null
      cameraSlotRef.current = 0
      setCanFlipCamera(false)
      setScanError(null)
      return
    }
    cameraSlotRef.current = 0
    flipConstraintsRef.current = null
  }, [open])

  useEffect(() => {
    if (!open) return

    setScanError(null)
    setScanning(true)
    let cancelled = false

    const run = async () => {
      try {
        if (!flipConstraintsRef.current) {
          flipConstraintsRef.current = await getQrCameraFlipConstraints()
        }
        const constraints = flipConstraintsRef.current
        if (cancelled) return

        setCanFlipCamera(constraints.length >= 2)

        const slot = Math.min(cameraSlotRef.current, Math.max(0, constraints.length - 1))
        const onSuccess = (decodedText: string) => {
          if (cancelled) return
          const s = scannerRef.current
          scannerRef.current = null
          void stopAndClear(s).then(() => {
            if (!cancelled) onDecodedRef.current(decodedText)
          })
        }

        const prev = scannerRef.current
        scannerRef.current = null
        await stopAndClear(prev)

        let scanner: Html5Qrcode
        if (constraints.length > 0) {
          scanner = await startLiveQrScannerWithCamera(
            containerId,
            constraints[slot],
            onSuccess,
            () => {},
          )
        } else {
          scanner = await startLiveQrScanner(containerId, onSuccess, () => {})
        }

        if (cancelled) {
          await stopAndClear(scanner)
          return
        }
        scannerRef.current = scanner
        setScanning(false)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
        setScanError(msg)
        setScanning(false)
        scannerRef.current = null
      }
    }

    const timer = setTimeout(() => void run(), 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
      const s = scannerRef.current
      scannerRef.current = null
      void stopAndClear(s)
    }
  }, [open, flipNonce, containerId, stopAndClear])

  const handleFlip = () => {
    const list = flipConstraintsRef.current
    if (!list || list.length < 2) return
    cameraSlotRef.current = (cameraSlotRef.current + 1) % list.length
    setFlipNonce((n) => n + 1)
  }

  const handleClose = () => {
    const s = scannerRef.current
    scannerRef.current = null
    void stopAndClear(s).then(() => onClose())
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl ${panelClassName} w-full p-6 shadow-xl`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description != null && <div className="text-sm text-gray-600 mb-4">{description}</div>}
        <div className="relative rounded-lg overflow-hidden bg-gray-100">
          <div id={containerId} className="min-h-[280px] sm:min-h-[400px] w-full max-h-[70vh]" />
          {canFlipCamera && !scanning && (
            <button
              type="button"
              onClick={handleFlip}
              className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white shadow-md hover:bg-black/70 active:scale-95 transition"
              aria-label="Cambiar de cámara"
              title="Cambiar de cámara"
            >
              <SwitchCamera className="h-6 w-6" strokeWidth={2} />
            </button>
          )}
        </div>
        {scanError && <p className="mt-3 text-sm text-red-600">{scanError}</p>}
        {scanning && !scanError && <p className="mt-2 text-sm text-gray-500">Iniciando cámara...</p>}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void handleClose()}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
