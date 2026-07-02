'use client'

import { Suspense } from 'react'
import HelpPageContent from './HelpPageContent'

export default function HelpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-600">Cargando manual…</div>
      }
    >
      <HelpPageContent />
    </Suspense>
  )
}
