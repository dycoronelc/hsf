'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { formatTicketGeneratedAt } from '@/lib/timezone'

export interface TicketPrintData {
  ticketNumber: string
  serviceName: string
  qrCode: string
  queuePosition?: number
  /** ISO o Date de creación del ticket */
  createdAt?: string | Date | null
}

const PRINT_BODY_CLASS = 'ticket-print-active'
const PRINT_ROOT_ID = 'ticket-print-root'

interface TicketPrintSlipProps {
  ticket: TicketPrintData
  footerNote?: string
}

export { formatTicketGeneratedAt }

export function TicketPrintSlip({
  ticket,
  footerNote = 'Presente este ticket en la ventanilla cuando sea llamado.',
}: TicketPrintSlipProps) {
  const { date, time } = formatTicketGeneratedAt(ticket.createdAt)

  return (
    <div className="ticket-print-slip mx-auto max-w-xs text-center text-gray-900">
      <div className="flex justify-center">
        <Image
          src="/logo-hospital-santa-fe.png"
          alt="Hospital Santa Fe"
          width={120}
          height={120}
          className="h-24 w-24 object-contain"
          unoptimized
          priority
        />
      </div>

      <p className="mt-4 text-base text-gray-900">Número de turno</p>
      <p className="mt-1 text-4xl font-bold tracking-tight text-gray-800">{ticket.ticketNumber}</p>

      {typeof ticket.queuePosition === 'number' && ticket.queuePosition > 0 && (
        <p className="mt-2 text-sm text-gray-600">Posición en cola: {ticket.queuePosition}</p>
      )}

      <div className="my-5 flex justify-center">
        <div className="rounded-lg bg-white p-3 ring-1 ring-gray-200">
          <QRCodeSVG value={ticket.qrCode} size={148} level="M" />
        </div>
      </div>

      <p className="text-sm text-gray-800">{footerNote}</p>

      <div className="mt-5 inline-flex items-center justify-center gap-3 rounded-full border-2 border-slate-700 px-5 py-2 text-sm font-semibold text-gray-900">
        <span>{date}</span>
        <span className="text-slate-400" aria-hidden>
          |
        </span>
        <span>{time}</span>
      </div>
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
