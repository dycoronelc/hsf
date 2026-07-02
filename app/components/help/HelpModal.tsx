'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FAQ_ITEMS, MANUAL_SECTIONS } from '@/lib/help/content'
import { getContextualHelpForRoute } from '@/lib/help/match-route'
import type { HelpPageContext, HelpTab } from '@/lib/help/types'

type Props = {
  open: boolean
  tab: HelpTab
  onTabChange: (tab: HelpTab) => void
  onClose: () => void
  pathname: string
  pageContext: HelpPageContext
  embedded?: boolean
}

const TABS: { id: HelpTab; label: string }[] = [
  { id: 'context', label: 'Esta pantalla' },
  { id: 'manual', label: 'Manual' },
  { id: 'faq', label: 'FAQ' },
]

export function HelpModal({
  open,
  tab,
  onTabChange,
  onClose,
  pathname,
  pageContext,
  embedded = false,
}: Props) {
  if (!open && !embedded) return null

  const contextual = getContextualHelpForRoute(pathname, pageContext)

  const body = (
    <div
      className={
        embedded
          ? 'bg-white rounded-lg shadow-lg border border-gray-200'
          : 'relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col'
      }
    >
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Centro de ayuda</h2>
          <p className="text-sm text-gray-500 mt-1">Hospital Santa Fe — guía en línea</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/help"
            target="_blank"
            className="hidden sm:inline text-sm text-hospital-blue hover:underline"
          >
            Abrir manual completo
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

      <div className="flex border-b border-gray-200 px-3 shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-hospital-blue text-hospital-blue'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
        {tab === 'context' && (
          <div className="space-y-4">
            {contextual.length === 0 ? (
              <p className="text-gray-600">
                No hay ayuda específica para esta pantalla. Consulte el manual completo o las preguntas
                frecuentes.
              </p>
            ) : (
              contextual.map((block) => (
                <section key={block.id} className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                  <h3 className="font-semibold text-gray-900">{block.title}</h3>
                  <p className="text-sm text-gray-700 mt-2">{block.summary}</p>
                  <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc list-inside">
                    {block.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        )}

        {tab === 'manual' && (
          <div className="space-y-8">
            {MANUAL_SECTIONS.map((section) => (
              <section key={section.id} id={`manual-${section.id}`} className="scroll-mt-4">
                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                {section.image && (
                  <figure className="my-4">
                    <div className="relative w-full max-w-md aspect-[16/10] rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <Image
                        src={section.image.src}
                        alt={section.image.alt}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 100vw, 400px"
                      />
                    </div>
                    {section.image.caption && (
                      <figcaption className="text-xs text-gray-500 mt-2">{section.image.caption}</figcaption>
                    )}
                  </figure>
                )}
                {section.paragraphs.map((p) => (
                  <p key={p} className="text-sm text-gray-700 mt-2 leading-relaxed">
                    {p}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-1.5 text-sm text-gray-700 list-disc list-inside">
                    {section.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}

        {tab === 'faq' && (
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.id}
                className="group rounded-lg border border-gray-200 bg-white open:shadow-sm"
              >
                <summary className="cursor-pointer px-4 py-3 font-medium text-gray-900 list-none flex justify-between gap-2">
                  <span>{item.question}</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3">
                  <span className="inline-block text-xs font-medium text-hospital-blue mb-2">
                    {item.category}
                  </span>
                  <p>{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-200 flex flex-wrap gap-3 shrink-0 bg-gray-50 rounded-b-xl">
        <Link
          href="/help"
          target="_blank"
          className="text-sm font-medium text-hospital-blue hover:underline"
        >
          Ver manual en página completa
        </Link>
        <Link
          href="/help?print=1"
          target="_blank"
          className="text-sm font-medium text-hospital-blue hover:underline"
        >
          Descargar / imprimir PDF
        </Link>
      </div>
    </div>
  )

  if (embedded) return body

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar"
        onClick={onClose}
      />
      {body}
    </div>
  )
}
