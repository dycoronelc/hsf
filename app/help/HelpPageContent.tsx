'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FAQ_ITEMS, MANUAL_SECTIONS } from '@/lib/help/content'
import { HospitalLogo } from '../components/HospitalLogo'

export default function HelpPageContent() {
  const searchParams = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => window.print(), 400)
      return () => clearTimeout(timer)
    }
  }, [autoPrint])

  return (
    <div className="min-h-screen bg-white">
      <header className="no-print border-b border-gray-200 bg-[#00816D] text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <HospitalLogo width={180} height={48} className="h-10 w-auto object-contain" />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="px-3 py-2 text-sm rounded-lg bg-white/15 hover:bg-white/25"
            >
              Volver
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-[#00816D] hover:bg-white/90"
            >
              Descargar / imprimir PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 print:py-4">
        <div className="print-only hidden mb-6 text-center border-b border-gray-300 pb-4">
          <Image
            src="/logo-hospital-santa-fe.png"
            alt="Hospital Santa Fe"
            width={220}
            height={60}
            className="mx-auto h-14 w-auto object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Manual de usuario</h1>
          <p className="text-sm text-gray-600 mt-1">Hospital Santa Fe Panamá — Preadmisiones</p>
        </div>

        <section className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 no-print">Manual de usuario</h1>
          <p className="text-gray-600 mt-2 no-print">
            Guía completa de la plataforma. Use el botón superior para guardar como PDF desde el diálogo de
            impresión de su navegador.
          </p>
        </section>

        <div className="space-y-10">
          {MANUAL_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="break-inside-avoid scroll-mt-6 border-b border-gray-100 pb-8 last:border-0"
            >
              <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
              {section.image && (
                <figure className="my-4">
                  <div className="relative w-full max-w-lg aspect-[16/10] rounded-lg overflow-hidden border border-gray-200 bg-gray-50 print:border-gray-400">
                    <Image
                      src={section.image.src}
                      alt={section.image.alt}
                      fill
                      className="object-contain p-3"
                      sizes="(max-width: 768px) 100vw, 512px"
                    />
                  </div>
                  {section.image.caption && (
                    <figcaption className="text-xs text-gray-500 mt-2">{section.image.caption}</figcaption>
                  )}
                </figure>
              )}
              {section.paragraphs.map((p) => (
                <p key={p} className="text-sm text-gray-700 mt-3 leading-relaxed">
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

        <section className="mt-12 pt-8 border-t border-gray-200 break-before-page">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes (FAQ)</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <article key={item.id} className="break-inside-avoid">
                <p className="text-xs font-semibold text-[#00816D] uppercase tracking-wide">{item.category}</p>
                <h3 className="font-semibold text-gray-900 mt-1">{item.question}</h3>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>© Hospital Santa Fe Panamá. Documento generado desde la plataforma de preadmisiones.</p>
        </footer>
      </main>
    </div>
  )
}
