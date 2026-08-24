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
  footerNote = 'Presente este ticket en ventanilla cuando sea llamado.',
}: TicketPrintSlipProps) {
  const { date, time } = formatTicketGeneratedAt(ticket.createdAt)

  return (
    <div className="ticket-print-slip flex flex-col items-center justify-between text-center text-gray-900">
      <div className="flex w-full flex-col items-center">
        <Image
          src="/logo-hospital-santa-fe.png"
          alt="Hospital Santa Fe"
          width={72}
          height={72}
          className="h-10 w-auto object-contain sm:h-12"
          unoptimized
          priority
        />

        <p className="mt-1 text-[10px] font-medium leading-tight text-gray-700 sm:text-xs">
          Número de turno
        </p>
        <p className="mt-0.5 text-2xl font-bold leading-none tracking-tight text-gray-900 sm:text-3xl">
          {ticket.ticketNumber}
        </p>

        {ticket.serviceName ? (
          <p className="mt-0.5 max-w-full truncate text-[9px] leading-tight text-gray-600 sm:text-[10px]">
            {ticket.serviceName}
          </p>
        ) : null}

        {typeof ticket.queuePosition === 'number' && ticket.queuePosition > 0 && (
          <p className="mt-0.5 text-[9px] leading-tight text-gray-600 sm:text-[10px]">
            Cola: {ticket.queuePosition}
          </p>
        )}
      </div>

      <div className="my-1 flex justify-center">
        <QRCodeSVG value={ticket.qrCode} size={72} level="M" className="h-[18mm] w-[18mm]" />
      </div>

      <div className="flex w-full flex-col items-center">
        <p className="max-w-full px-1 text-[8px] leading-tight text-gray-800 sm:text-[9px]">
          {footerNote}
        </p>

        <div className="mt-1 inline-flex items-center justify-center gap-2 rounded border border-slate-700 px-2 py-0.5 text-[9px] font-semibold leading-tight text-gray-900 sm:text-[10px]">
          <span>{date}</span>
          <span className="text-slate-400" aria-hidden>
            |
          </span>
          <span>{time}</span>
        </div>
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
          <p className="mb-3 text-xs text-gray-500">
            Formato de impresión: 7,9 cm × 10 cm (ticket térmico).
          </p>
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
