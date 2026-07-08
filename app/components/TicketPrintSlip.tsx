'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'

export interface TicketPrintData {
  ticketNumber: string
  serviceName: string
  qrCode: string
  queuePosition?: number
}

const PRINT_BODY_CLASS = 'ticket-print-active'
const PRINT_ROOT_ID = 'ticket-print-root'

interface TicketPrintSlipProps {
  ticket: TicketPrintData
  footerNote?: string
}

export function TicketPrintSlip({
  ticket,
  footerNote = 'Presente este ticket en la ventanilla cuando sea llamado.',
}: TicketPrintSlipProps) {
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
        <div className="rounded-lg bg-white p-3 ring-1 ring-gray-200">
          <QRCodeSVG value={ticket.qrCode} size={128} level="M" />
        </div>
      </div>
      <p className="text-xs text-gray-500">{footerNote}</p>
    </div>
  )
}

function useTicketPrintBodyClass(active: boolean) {
  useEffect(() => {
    if (!active) return
    document.body.classList.add(PRINT_BODY_CLASS)
    return () => document.body.classList.remove(PRINT_BODY_CLASS)
  }, [active])
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
  useTicketPrintBodyClass(true)

  useEffect(() => {
    if (!autoPrint) return
    const timer = window.setTimeout(() => window.print(), 500)
    return () => window.clearTimeout(timer)
  }, [autoPrint, ticket.ticketNumber])

  const printPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <div id={PRINT_ROOT_ID} className="print-only" aria-hidden="true">
            <TicketPrintSlip ticket={ticket} />
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 no-print"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-print-title"
      >
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 id="ticket-print-title" className="mb-4 text-lg font-semibold text-gray-900">
            Ticket generado
          </h2>
          <TicketPrintSlip ticket={ticket} />
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
      </div>
      {printPortal}
    </>
  )
}
