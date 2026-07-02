'use client'

import { useHelp } from '@/app/components/help/HelpProvider'
import type { HelpTab } from '@/lib/help/types'

type Props = {
  tab?: HelpTab
  variant?: 'header' | 'inline' | 'floating'
  className?: string
  label?: string
}

export function HelpLauncher({ tab = 'context', variant = 'inline', className = '', label }: Props) {
  const { openHelp } = useHelp()

  const text = label ?? 'Ayuda'

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={() => openHelp(tab)}
        className={`text-white/90 hover:text-white font-medium inline-flex items-center gap-1.5 ${className}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {text}
      </button>
    )
  }

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={() => openHelp(tab)}
        className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#00816D] text-white shadow-lg px-4 py-3 hover:bg-[#006b59] ${className}`}
        aria-label="Abrir ayuda"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-semibold">{text}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => openHelp(tab)}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-hospital-blue hover:text-hospital-blue-dark hover:underline ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {text}
    </button>
  )
}
