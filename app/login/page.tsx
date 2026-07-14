'use client'

import { Suspense } from 'react'
import LoginPageContent from './LoginPageContent'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-600">Cargando…</div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
