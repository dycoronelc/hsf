'use client'

import { useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export interface TicketPrintData {
  ticketNumber: string
  serviceName: string
  qrCode: string
  queuePosition?: number
}

interface TicketPrintSlipProps {
  ticket: TicketPrintData
  autoPrint?: boolean
  onPrinted?: () => void
  footerNote?: string
}

export function TicketPrintSlip({
  ticket,
  autoPrint = false,
  onPrinted,
  footerNote = 'Presente este ticket en la ventanilla cuando sea llamado.',
}: TicketPrintSlipProps) {
  useEffect(() => {
    if (!autoPrint) return
    const timer = window.setTimeout(() => {
      window.print()
      onPrinted?.()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [autoPrint, ticket.ticketNumber, onPrinted])

  return (
    <div className="ticket-print-slip mx-auto max-w-xs text-center text-gray-900">
      <p className="text-base font-bold text-hospital-blue">Hospital Santa Fe</p>
      <p className="text-xs uppercase tracking-wide text-gray-500">Panamá</p>
      <p className="mt-1 text-sm font-medium text-gray-700">{ticket.serviceName}</p>
      <p className="mt-4 text-xs text-gray-500">Número de turno</p>
      <p className="text-4xl font-bold text-hospital-blue">{ticket.ticketNumber}</p>
      {typeof ticket.queuePosition === 'number' && ticket.queuePosition > 0 && (
        <p className="mt-2 text-sm text-gray-600">Posición en cola: {ticket.queuePosition}</p>
      )}
      <div className="my-4 flex justify-center">
        <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <QRCodeSVG value={ticket.qrCode} size={128} level="M" />
        </div>
      </div>
      <p className="text-xs text-gray-500">{footerNote}</p>
    </div>
  )
}

export function TicketPrintOverlay({
  ticket,
  autoPrint,
  onClose,
}: {
  ticket: TicketPrintData
  autoPrint?: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 no-print">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Ticket generado</h2>
        <TicketPrintSlip ticket={ticket} autoPrint={autoPrint} />
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-hospital-blue px-4 py-2 text-sm font-medium text-white hover:bg-hospital-blue-dark"
          >
            Imprimir de nuevo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
      <div className="print-only fixed inset-0 flex items-center justify-center bg-white p-8">
        <TicketPrintSlip ticket={ticket} />
      </div>
    </div>
  )
}
