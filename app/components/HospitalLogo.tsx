import Image from 'next/image'
import Link from 'next/link'

type HospitalLogoProps = {
  href?: string
  width?: number
  height?: number
  className?: string
}

export function HospitalLogo({
  href,
  width = 140,
  height = 36,
  className = 'h-9 w-auto object-contain',
}: HospitalLogoProps) {
  const img = (
    <Image
      src="/logo-blanco.png"
      alt="Hospital Santa Fe Panamá"
      width={width}
      height={height}
      className={className}
      priority
    />
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {img}
      </Link>
    )
  }

  return img
}
