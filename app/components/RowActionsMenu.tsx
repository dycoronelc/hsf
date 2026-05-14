'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'

export type RowActionItem = {
  key: string
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

export function RowActionsMenu({ items }: { items: RowActionItem[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Acciones"
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false)
                if (!it.disabled) it.onClick()
              }}
              className={`block w-full px-3 py-2 text-left text-sm whitespace-nowrap disabled:opacity-50 ${
                it.danger ? 'text-red-700 hover:bg-red-50' : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
