'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FAQ_ITEMS } from '@/lib/help/content'
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
    <div className="min-h-screen hospital-page-bg">
      <header className="no-print border-b border-gray-200 bg-[#00816D] text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <HospitalLogo width={180} height={48} className="h-10 w-auto object-contain" />
          <Link
            href="/dashboard"
            className="px-3 py-2 text-sm rounded-lg bg-white/15 hover:bg-white/25"
          >
            Volver
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Preguntas frecuentes</h1>
        <p className="text-gray-600 mb-8">
          Respuestas rápidas sobre la plataforma de preadmisiones del Hospital Santa Fe.
        </p>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 group"
            >
              <summary className="font-semibold text-gray-900 cursor-pointer list-none flex justify-between items-center gap-2">
                {item.question}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </main>
    </div>
  )
}
