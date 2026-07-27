/**
 * Comprime/redimensiona imágenes del navegador (p. ej. fotos de cámara del celular)
 * antes de subirlas por multipart, para evitar 413 y timeouts.
 */

const DEFAULT_MAX_EDGE = 1280
const DEFAULT_QUALITY = 0.62
const DEFAULT_TARGET_BYTES = 1.2 * 1024 * 1024

function isRasterImage(file: File): boolean {
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/') && type !== 'image/svg+xml') return true
  return /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name)
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo comprimir la imagen'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

function outputBaseName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '').trim() || 'foto'
  // Evita nombres enormes de cámara Android/iOS
  return base.slice(0, 40)
}

/**
 * Si el archivo es imagen y supera umbrales de tamaño/resolución, lo redimensiona a JPEG.
 * Los PDF y archivos pequeños se devuelven sin cambios.
 */
export async function compressImageForUpload(
  file: File,
  options?: {
    maxEdge?: number
    quality?: number
    targetBytes?: number
  },
): Promise<File> {
  if (!isRasterImage(file)) return file

  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE
  const quality = options?.quality ?? DEFAULT_QUALITY
  const targetBytes = options?.targetBytes ?? DEFAULT_TARGET_BYTES

  // Ya es liviana: no tocar
  if (file.size <= targetBytes && file.type === 'image/jpeg') {
    try {
      const img = await loadImageFromFile(file)
      if (img.naturalWidth <= maxEdge && img.naturalHeight <= maxEdge) {
        return file
      }
    } catch {
      return file
    }
  }

  try {
    const img = await loadImageFromFile(file)
    const srcW = img.naturalWidth || img.width
    const srcH = img.naturalHeight || img.height
    if (!srcW || !srcH) return file

    const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
    const width = Math.max(1, Math.round(srcW * scale))
    const height = Math.max(1, Math.round(srcH * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    let q = quality
    let blob = await canvasToBlob(canvas, 'image/jpeg', q)
    // Segunda pasada si sigue pesada
    if (blob.size > targetBytes && q > 0.45) {
      q = 0.48
      blob = await canvasToBlob(canvas, 'image/jpeg', q)
    }
    if (blob.size > targetBytes && Math.max(width, height) > 1024) {
      const scale2 = 1024 / Math.max(width, height)
      canvas.width = Math.max(1, Math.round(width * scale2))
      canvas.height = Math.max(1, Math.round(height * scale2))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.48)
    }

    // Si la compresión no ayuda (raro), conservar original
    if (blob.size >= file.size) return file

    const name = `${outputBaseName(file)}.jpg`
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
