'use client'

type Props = {
  minutesLeft: number
  onExtend: () => void
  onLogout: () => void
  extending?: boolean
}

export function SessionExpiringModal({ minutesLeft, onExtend, onLogout, extending }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expiring-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-hospital-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 id="session-expiring-title" className="text-lg font-bold text-gray-900">
              Su sesión está por expirar
            </h2>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              Por seguridad, su sesión expirará en aproximadamente{' '}
              <strong>{Math.max(1, minutesLeft)} minuto{minutesLeft !== 1 ? 's' : ''}</strong>.
              ¿Desea mantener la sesión activa?
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onExtend}
            disabled={extending}
            className="flex-1 bg-hospital-blue text-white py-3 rounded-lg font-semibold hover:bg-hospital-blue-dark transition-colors disabled:opacity-50"
          >
            {extending ? 'Renovando…' : 'Mantener sesión activa'}
          </button>
          <button
            type="button"
            onClick={onLogout}
            disabled={extending}
            className="flex-1 border border-gray-300 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
