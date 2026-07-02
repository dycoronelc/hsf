'use client'

type Props = {
  message: string
  onLogin: () => void
}

export function SessionExpiredModal({ message, onLogin }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 id="session-expired-title" className="text-lg font-bold text-gray-900">
              Sesión expirada
            </h2>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogin}
          className="mt-6 w-full bg-hospital-blue text-white py-3 rounded-lg font-semibold hover:bg-hospital-blue-dark transition-colors"
        >
          Iniciar sesión
        </button>
      </div>
    </div>
  )
}
