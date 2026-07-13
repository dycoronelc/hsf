'use client'

import Link from 'next/link'
import { FAQ_ITEMS } from '@/lib/help/content'

type Props = {
  open: boolean
  onClose: () => void
  embedded?: boolean
}

export function HelpModal({ open, onClose, embedded = false }: Props) {
  if (!open && !embedded) return null

  const body = (
    <div
      className={
        embedded
          ? 'bg-white rounded-lg shadow-lg border border-gray-200'
          : 'relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col'
      }
    >
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Preguntas frecuentes</h2>
          <p className="text-sm text-gray-500 mt-1">Hospital Santa Fe — ayuda rápida</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/help"
            target="_blank"
            className="hidden sm:inline text-sm text-hospital-blue hover:underline"
          >
            Ver todas
          </Link>
          {!embedded && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Cerrar ayuda"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.id}
            className="rounded-lg border border-gray-200 p-3 bg-gray-50/80"
          >
            <summary className="font-medium text-gray-900 cursor-pointer text-sm">
              {item.question}
            </summary>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  )

  if (embedded) return body

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40">
      {body}
    </div>
  )
}
