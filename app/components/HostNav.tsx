'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/host', label: 'Llegadas (preadmisión)' },
  { href: '/host/turnos', label: 'Crear turnos Adm/Lab/Rad' },
]

export function HostNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
      {links.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-hospital-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
