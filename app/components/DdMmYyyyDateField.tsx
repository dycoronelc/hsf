'use client'

import { useId } from 'react'
import { ddMmYyyyToIso, isoToDdMmYyyy } from '@/lib/dateUtils'

type Props = {
  label: string
  value: string
  onChange: (ddMmYyyy: string) => void
  required?: boolean
  /** yyyy-mm-dd para input min */
  minIso?: string
  /** yyyy-mm-dd para input max */
  maxIso?: string
}

export function DdMmYyyyDateField({ label, value, onChange, required, minIso, maxIso }: Props) {
  const id = useId().replace(/:/g, '')
  const iso = ddMmYyyyToIso(value)

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        id={id}
        type="date"
        lang="es"
        className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-lg text-base text-gray-900 bg-white"
        value={iso}
        min={minIso}
        max={maxIso}
        onChange={(e) => onChange(e.target.value ? isoToDdMmYyyy(e.target.value) : '')}
        required={required}
      />
      <p className="text-xs text-gray-500 mt-1">
        {value ? (
          <>
            Formato enviado: <span className="font-mono tabular-nums">{value}</span>
          </>
        ) : (
          <>Seleccione la fecha en el calendario (en el móvil verá el selector nativo).</>
        )}
      </p>
    </div>
  )
}
