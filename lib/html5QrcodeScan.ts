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
      // Ideal muy alto en móvil a veces hace que el SO elija otra cámara o falle el stream trasero.
      width: { ideal: 1280, min: 320 },
      height: { ideal: 720, min: 240 },
    },
  }
}

function looksLikeFrontCameraLabel(label: string): boolean {
  const l = label.toLowerCase()
  return (
    /front|selfie|user|facial|face\s*time|delanter|frontal|orientaci[oó]n\s+frontal|facing\s+front|para\s+selfies/i.test(
      l,
    )
  )
}

function looksLikeRearCameraLabel(label: string): boolean {
  const l = label.toLowerCase()
  if (looksLikeFrontCameraLabel(l)) return false
  return (
    /back|rear|trasera|posterior|retro|environment|world|wide|tele|facing\s+back|orientaci[oó]n\s+trasera|orientaci[oó]n\s+posterior|cámara\s+trasera|camera\s+\d+\s*,\s*facing\s+back/i.test(
      l,
    )
  )
}

function pushConstraintUnique(
  list: Array<string | MediaTrackConstraints>,
  seen: Set<string>,
  c: string | MediaTrackConstraints,
) {
  const key = typeof c === 'string' ? `s:${c}` : `o:${JSON.stringify(c)}`
  if (seen.has(key)) return
  seen.add(key)
  list.push(c)
}

/**
 * Orden de prueba: primero facingMode "environment" (el SO elige la trasera),
 * luego deviceId de cámaras que por etiqueta parecen traseras,
 * luego cámaras neutras, luego el resto, y al final la frontal.
 */
export async function buildCameraConfigsOrder(): Promise<Array<string | MediaTrackConstraints>> {
  const configs: Array<string | MediaTrackConstraints> = []
  const seen = new Set<string>()

  pushConstraintUnique(configs, seen, { facingMode: { exact: 'environment' } })
  pushConstraintUnique(configs, seen, { facingMode: 'environment' })
  pushConstraintUnique(configs, seen, { facingMode: { ideal: 'environment' } })

  const cameras = await Html5Qrcode.getCameras().catch(() => [] as { id: string; label: string }[])

  const rear = cameras.filter((c) => looksLikeRearCameraLabel(c.label))
  const neutral = cameras.filter(
    (c) => !looksLikeRearCameraLabel(c.label) && !looksLikeFrontCameraLabel(c.label),
  )
  const front = cameras.filter((c) => looksLikeFrontCameraLabel(c.label))

  for (const c of rear) {
    pushConstraintUnique(configs, seen, { deviceId: { exact: c.id } })
  }
  for (const c of neutral) {
    pushConstraintUnique(configs, seen, { deviceId: { exact: c.id } })
  }
  for (const c of front) {
    pushConstraintUnique(configs, seen, { deviceId: { exact: c.id } })
  }

  pushConstraintUnique(configs, seen, { facingMode: 'user' })
  return configs
}

/** Cámaras únicas ordenadas: traseras primero, luego neutras, luego frontales (para conmutar con deviceId). */
export async function getOrderedCameraDevices(): Promise<{ id: string; label: string }[]> {
  const cameras = await Html5Qrcode.getCameras().catch(() => [] as { id: string; label: string }[])
  const seen = new Set<string>()
  const uniq = cameras.filter((c) => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })
  const rear = uniq.filter((c) => looksLikeRearCameraLabel(c.label))
  const neutral = uniq.filter(
    (c) => !looksLikeRearCameraLabel(c.label) && !looksLikeFrontCameraLabel(c.label),
  )
  const front = uniq.filter((c) => looksLikeFrontCameraLabel(c.label))
  return [...rear, ...neutral, ...front]
}

/**
 * En Chrome/Android (y en parte iOS) las etiquetas de videoinput suelen quedar vacías hasta el primer
 * getUserMedia. Sin eso, todas las cámaras caen en "neutral" y el deviceId suele abrir siempre la misma.
 * Una PWA no cambia esto: es comportamiento del navegador, no del “modo app”.
 */
export async function primeCameraEnumeration(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
  const tryStream = async (constraints: MediaStreamConstraints) => {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    for (const t of stream.getTracks()) t.stop()
  }
  try {
    await tryStream({ video: { facingMode: { ideal: 'environment' } }, audio: false })
    return
  } catch {
    /* */
  }
  try {
    await tryStream({ video: { facingMode: { ideal: 'user' } }, audio: false })
    return
  } catch {
    /* */
  }
  try {
    await tryStream({ video: true, audio: false })
  } catch {
    /* sin permiso aún: getCameras puede seguir limitado */
  }
}

function constraintKey(c: string | MediaTrackConstraints): string {
  return typeof c === 'string' ? `s:${c}` : `o:${JSON.stringify(c)}`
}

/**
 * Lista para el botón “cambiar cámara”: primero facingMode trasera/frontal (muy fiable en móviles),
 * luego cada videoinput por deviceId (traseras → neutras → frontales) tras enumerar con permiso.
 */
export async function getQrCameraFlipConstraints(): Promise<Array<string | MediaTrackConstraints>> {
  await primeCameraEnumeration()
  const out: Array<string | MediaTrackConstraints> = []
  const seen = new Set<string>()
  const add = (c: string | MediaTrackConstraints) => {
    const k = constraintKey(c)
    if (seen.has(k)) return
    seen.add(k)
    out.push(c)
  }

  add({ facingMode: { exact: 'environment' } })
  add({ facingMode: 'environment' })
  add({ facingMode: { ideal: 'environment' } })
  add({ facingMode: { exact: 'user' } })
  add({ facingMode: 'user' })
  add({ facingMode: { ideal: 'user' } })

  for (const d of await getOrderedCameraDevices()) {
    add({ deviceId: { exact: d.id } })
  }

  return out
}

/**
 * Inicia el escáner con una sola restricción de cámara (p. ej. deviceId exacto).
 */
export async function startLiveQrScannerWithCamera(
  elementId: string,
  cameraConfig: string | MediaTrackConstraints,
  onDecoded: (decodedText: string) => void,
  onScanFailure: () => void,
): Promise<Html5Qrcode> {
  const scanner = createHtml5QrInstance(elementId)
  const scanConfig = buildQrScanConfig()
  try {
    await scanner.start(cameraConfig, scanConfig, onDecoded, onScanFailure)
    return scanner
  } catch (e) {
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
    throw e
  }
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
