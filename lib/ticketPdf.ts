import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { formatTicketGeneratedAt } from '@/lib/timezone'

export type TicketPdfInput = {
  ticketNumber: string
  serviceName?: string
  qrCode: string
  queuePosition?: number
  createdAt?: string | Date | null
  footerNote?: string
}

/** Página exacta del ticket térmico: 7,9 cm × 10 cm */
export const TICKET_PDF_WIDTH_MM = 79
export const TICKET_PDF_HEIGHT_MM = 100

const DEFAULT_FOOTER = 'Presente este ticket en ventanilla cuando sea llamado.'

async function loadImageDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function imageFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG'
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
  return 'PNG'
}

/** Dimensiones naturales del PNG (para no deformar el logo en el PDF). */
function loadImageNaturalSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height })
    img.onerror = () => reject(new Error('No se pudo leer el logo'))
    img.src = dataUrl
  })
}

/**
 * Genera un PDF de una sola página 79×100 mm con el contenido del ticket.
 */
export async function buildTicketPdf(ticket: TicketPdfInput): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [TICKET_PDF_WIDTH_MM, TICKET_PDF_HEIGHT_MM],
    compress: true,
  })

  const pageW = TICKET_PDF_WIDTH_MM
  const marginX = 4
  const contentW = pageW - marginX * 2
  let y = 3

  const logo = await loadImageDataUrl('/logo-hospital-santa-fe.png')
  if (logo) {
    try {
      const natural = await loadImageNaturalSize(logo)
      const aspect = natural.width > 0 && natural.height > 0 ? natural.width / natural.height : 4.5
      // Logo horizontal oficial (~1218×272): caber en el ticket sin aplastarlo
      const maxLogoW = Math.min(contentW, 58)
      const maxLogoH = 14
      let logoW = maxLogoW
      let logoH = logoW / aspect
      if (logoH > maxLogoH) {
        logoH = maxLogoH
        logoW = logoH * aspect
      }
      doc.addImage(
        logo,
        imageFormatFromDataUrl(logo),
        (pageW - logoW) / 2,
        y,
        logoW,
        logoH,
        undefined,
        'FAST',
      )
      y += logoH + 2.5
    } catch {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(0, 129, 109)
      doc.text('Hospital Santa Fe', pageW / 2, y + 4, { align: 'center' })
      y += 10
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 129, 109)
    doc.text('Hospital Santa Fe', pageW / 2, y + 4, { align: 'center' })
    y += 10
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(55, 65, 81)
  doc.text('Número de turno', pageW / 2, y, { align: 'center' })
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(17, 24, 39)
  doc.text(ticket.ticketNumber || '—', pageW / 2, y, { align: 'center' })
  y += 6

  if (ticket.serviceName?.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(75, 85, 99)
    doc.text(ticket.serviceName.trim(), pageW / 2, y, {
      align: 'center',
      maxWidth: contentW,
    })
    y += 4
  }

  if (typeof ticket.queuePosition === 'number' && ticket.queuePosition > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(75, 85, 99)
    doc.text(`Cola: ${ticket.queuePosition}`, pageW / 2, y, { align: 'center' })
    y += 4
  }

  const qrDataUrl = await QRCode.toDataURL(ticket.qrCode || ticket.ticketNumber || 'ticket', {
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
  })
  const qrSize = 28
  const qrX = (pageW - qrSize) / 2
  y = Math.max(y + 2, 42)
  doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize)
  y += qrSize + 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(31, 41, 55)
  const footer = ticket.footerNote?.trim() || DEFAULT_FOOTER
  const footerLines = doc.splitTextToSize(footer, contentW)
  doc.text(footerLines, pageW / 2, y, { align: 'center' })
  y += footerLines.length * 3.2 + 3

  const { date, time } = formatTicketGeneratedAt(ticket.createdAt)
  const stamp = `${date}  |  ${time}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(17, 24, 39)
  const stampW = Math.min(contentW, doc.getTextWidth(stamp) + 4)
  const stampX = (pageW - stampW) / 2
  const stampH = 6
  // Empujar el sello hacia abajo si hay espacio; no salirse de la página
  const stampY = Math.min(Math.max(y, 88), TICKET_PDF_HEIGHT_MM - stampH - 3)
  doc.setDrawColor(51, 65, 85)
  doc.setLineWidth(0.3)
  doc.roundedRect(stampX, stampY, stampW, stampH, 1, 1, 'S')
  doc.text(stamp, pageW / 2, stampY + 4, { align: 'center' })

  return doc
}

export async function downloadTicketPdf(ticket: TicketPdfInput): Promise<void> {
  const doc = await buildTicketPdf(ticket)
  const safeName = (ticket.ticketNumber || 'ticket').replace(/[^\w.-]+/g, '_')
  doc.save(`ticket-${safeName}.pdf`)
}

/** Abre el PDF en una pestaña nueva (el usuario puede imprimir con tamaño de página del PDF). */
export async function openTicketPdfForPrint(ticket: TicketPdfInput): Promise<void> {
  const doc = await buildTicketPdf(ticket)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) {
    // Pop-up bloqueado: descarga directa
    doc.save(`ticket-${(ticket.ticketNumber || 'ticket').replace(/[^\w.-]+/g, '_')}.pdf`)
    URL.revokeObjectURL(url)
    return
  }
  // Liberar el blob después de un tiempo (la pestaña ya lo cargó)
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
