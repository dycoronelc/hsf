import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  type Html5QrcodeCameraScanConfig,
} from 'html5-qrcode'

const SCANNER_VERBOSE = false

export function createHtml5QrInstance(elementId: string): Html5Qrcode {
  return new Html5Qrcode(elementId, {
    verbose: SCANNER_VERBOSE,
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    useBarCodeDetectorIfSupported: true,
  })
}

export function buildQrScanConfig(): Html5QrcodeCameraScanConfig {
  return {
    fps: 18,
    aspectRatio: 1.0,
    disableFlip: false,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
      const side = Math.floor(Math.max(240, Math.min(minEdge * 0.82, 560)))
      return { width: side, height: side }
    },
    videoConstraints: {
      width: { ideal: 1920, min: 640 },
      height: { ideal: 1080, min: 480 },
    },
  }
}

/** Orden: cámaras traseras por etiqueta, luego todas, luego facingMode. */
export async function buildCameraConfigsOrder(): Promise<Array<string | MediaTrackConstraints>> {
  const configs: Array<string | MediaTrackConstraints> = []
  const cameras = await Html5Qrcode.getCameras().catch(() => [] as { id: string; label: string }[])
  const seen = new Set<string>()

  for (const c of cameras) {
    if (/back|rear|trasera|wide|environment/i.test(c.label) && !seen.has(c.id)) {
      seen.add(c.id)
      configs.push({ deviceId: { exact: c.id } })
    }
  }
  for (const c of cameras) {
    if (!seen.has(c.id)) {
      seen.add(c.id)
      configs.push(c.id)
    }
  }
  configs.push({ facingMode: { ideal: 'environment' } })
  configs.push({ facingMode: 'environment' })
  configs.push({ facingMode: 'user' })
  return configs
}

/**
 * Inicia escaneo QR en vivo. Reintenta con otra cámara si falla (útil en laptops sin cámara trasera).
 */
export async function startLiveQrScanner(
  elementId: string,
  onDecoded: (decodedText: string) => void,
  onScanFailure: () => void,
): Promise<Html5Qrcode> {
  const scanConfig = buildQrScanConfig()
  const cameraConfigs = await buildCameraConfigsOrder()
  let lastErr: unknown

  for (const cam of cameraConfigs) {
    const scanner = createHtml5QrInstance(elementId)
    try {
      await scanner.start(cam, scanConfig, onDecoded, onScanFailure)
      return scanner
    } catch (e) {
      lastErr = e
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
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : 'No se pudo iniciar la cámara'
  throw new Error(msg)
}

export async function decodeQrFromImageFile(elementId: string, file: File): Promise<string> {
  const scanner = createHtml5QrInstance(elementId)
  try {
    return await scanner.scanFile(file, false)
  } finally {
    try {
      scanner.clear()
    } catch {
      /* */
    }
  }
}
