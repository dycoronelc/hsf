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

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(navigator.userAgent)
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
    /back|rear|trasera|posterior|retro|environment|world|wide|tele|main|facing\s+back|orientaci[oó]n\s+trasera|orientaci[oó]n\s+posterior|c[aá]mara\s+trasera|camera\s+2,\s*facing\s+back|camera\s+0,\s*facing\s+back/i.test(
      l,
    )
  )
}

async function enumerateVideoInputs(): Promise<Array<{ id: string; label: string }>> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return []
  }
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'videoinput' && d.deviceId)
    .map((d) => ({ id: d.deviceId, label: d.label || '' }))
}

/**
 * html5-qrcode: si scanConfig.videoConstraints está definido, IGNORA cameraIdOrConfig
 * y solo usa videoConstraints. Por eso facingMode/deviceId deben ir DENTRO de videoConstraints.
 */
export function buildQrScanConfig(
  camera?: string | MediaTrackConstraints,
): Html5QrcodeCameraScanConfig {
  const resolution: MediaTrackConstraints = {
    width: { ideal: 1280, min: 320 },
    height: { ideal: 720, min: 240 },
  }

  let videoConstraints: MediaTrackConstraints

  if (!camera) {
    videoConstraints = {
      ...resolution,
      facingMode: { ideal: 'environment' },
    }
  } else if (typeof camera === 'string') {
    videoConstraints = {
      ...resolution,
      deviceId: { exact: camera },
    }
  } else {
    videoConstraints = {
      ...resolution,
      ...camera,
    }
  }

  return {
    fps: 18,
    aspectRatio: 1.0,
    disableFlip: false,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
      const side = Math.floor(Math.max(240, Math.min(minEdge * 0.82, 560)))
      return { width: side, height: side }
    },
    videoConstraints,
  }
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

export async function getOrderedCameraDevices(): Promise<{ id: string; label: string }[]> {
  const cameras = await enumerateVideoInputs()
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
 * Pide permiso con cámara trasera para que enumerateDevices devuelva etiquetas (Android/iOS).
 */
export async function primeCameraEnumeration(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
  const tryStream = async (constraints: MediaStreamConstraints) => {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    for (const t of stream.getTracks()) t.stop()
  }
  try {
    await tryStream({ video: { facingMode: { exact: 'environment' } }, audio: false })
    return
  } catch {
    /* */
  }
  try {
    await tryStream({ video: { facingMode: { ideal: 'environment' } }, audio: false })
    return
  } catch {
    /* */
  }
  try {
    await tryStream({ video: { facingMode: 'environment' }, audio: false })
  } catch {
    try {
      await tryStream({ video: true, audio: false })
    } catch {
      /* sin permiso */
    }
  }
}

function constraintKey(c: string | MediaTrackConstraints): string {
  return typeof c === 'string' ? `s:${c}` : `o:${JSON.stringify(c)}`
}

/**
 * Orden de cámaras para escaneo: trasera primero (facingMode y deviceId).
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

  add({ facingMode: 'environment' })
  add({ facingMode: { exact: 'environment' } })
  add({ facingMode: { ideal: 'environment' } })

  const cameras = await getOrderedCameraDevices()
  const rear = cameras.filter((c) => looksLikeRearCameraLabel(c.label))
  const neutral = cameras.filter(
    (c) => !looksLikeRearCameraLabel(c.label) && !looksLikeFrontCameraLabel(c.label),
  )
  const front = cameras.filter((c) => looksLikeFrontCameraLabel(c.label))

  for (const c of rear) {
    add({ deviceId: { exact: c.id } })
  }

  if (isMobileDevice() && rear.length === 0 && cameras.length >= 2) {
    // Sin etiquetas: en muchos Android la trasera es la primera; en algunos iPhone la última.
    add({ deviceId: { exact: cameras[0].id } })
    if (cameras.length > 1) {
      add({ deviceId: { exact: cameras[cameras.length - 1].id } })
    }
    for (const c of cameras.slice(1, -1)) {
      add({ deviceId: { exact: c.id } })
    }
  } else {
    for (const c of neutral) {
      add({ deviceId: { exact: c.id } })
    }
  }

  add({ facingMode: 'user' })
  for (const c of front) {
    add({ deviceId: { exact: c.id } })
  }

  return out
}

export async function buildCameraConfigsOrder(): Promise<Array<string | MediaTrackConstraints>> {
  return getQrCameraFlipConstraints()
}

function dummyCameraIdForStart(cameraConfig: string | MediaTrackConstraints): string | MediaTrackConstraints {
  if (typeof cameraConfig === 'string') return cameraConfig
  if ('facingMode' in cameraConfig && cameraConfig.facingMode) {
    return { facingMode: 'environment' }
  }
  if ('deviceId' in cameraConfig) {
    return cameraConfig
  }
  return { facingMode: 'environment' }
}

export async function startLiveQrScannerWithCamera(
  elementId: string,
  cameraConfig: string | MediaTrackConstraints,
  onDecoded: (decodedText: string) => void,
  onScanFailure: () => void,
): Promise<Html5Qrcode> {
  const scanner = createHtml5QrInstance(elementId)
  const scanConfig = buildQrScanConfig(cameraConfig)
  try {
    await scanner.start(
      dummyCameraIdForStart(cameraConfig),
      scanConfig,
      onDecoded,
      onScanFailure,
    )
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

export async function startLiveQrScanner(
  elementId: string,
  onDecoded: (decodedText: string) => void,
  onScanFailure: () => void,
): Promise<Html5Qrcode> {
  const cameraConfigs = await buildCameraConfigsOrder()
  let lastErr: unknown

  for (const cam of cameraConfigs) {
    const scanner = createHtml5QrInstance(elementId)
    try {
      await scanner.start(
        dummyCameraIdForStart(cam),
        buildQrScanConfig(cam),
        onDecoded,
        onScanFailure,
      )
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
