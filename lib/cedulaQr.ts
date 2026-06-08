import { isValidDdMmYyyy } from '@/lib/dateUtils'

export type CedulaQrParsed = Record<string, string>

export async function parseCedulaQrRaw(raw: string): Promise<CedulaQrParsed> {
  const response = await fetch('/api/preadmission/parse-cedula-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  })
  if (!response.ok) {
    throw new Error('No se pudo interpretar el QR de la cédula')
  }
  return response.json() as Promise<CedulaQrParsed>
}

export function buildFullNameFromParsed(parsed: CedulaQrParsed): string {
  const nom =
    parsed.nombres ||
    parsed.NOMBRE ||
    parsed.nombre ||
    [parsed.name1, parsed.name2].filter(Boolean).join(' ').trim()
  const ape = parsed.apellidos || parsed.APELLIDO || parsed.apellido || ''
  const partsNom = nom.trim() ? nom.trim().split(/\s+/) : []
  const partsApe = ape.trim() ? ape.trim().split(/\s+/) : []
  const name1 = parsed.name1 || partsNom[0] || ''
  const name2 = parsed.name2 || partsNom.slice(1).join(' ') || ''
  const apellido1 = parsed.apellido1 || partsApe[0] || ''
  const apellido2 = parsed.apellido2 || partsApe.slice(1).join(' ') || ''
  return [name1, name2, apellido1, apellido2].filter(Boolean).join(' ').trim()
}

export function mapParsedToPreadmissionFields<T extends Record<string, unknown>>(
  prev: T,
  parsed: CedulaQrParsed,
): T {
  const cedula =
    parsed.cedula ||
    parsed.Cedula ||
    parsed.ID ||
    parsed.id ||
    parsed.rawSegment1 ||
    (prev.cedula as string | undefined) ||
    ''
  const nom =
    parsed.nombres ||
    parsed.NOMBRE ||
    parsed.nombre ||
    parsed.rawSegment1 ||
    ''
  const ape =
    parsed.apellidos ||
    parsed.APELLIDO ||
    parsed.apellido ||
    parsed.rawSegment2 ||
    ''
  const partsNom = nom.trim() ? nom.trim().split(/\s+/) : []
  const partsApe = ape.trim() ? ape.trim().split(/\s+/) : []
  const name1 = parsed.name1 || partsNom[0] || (prev.name1 as string | undefined) || ''
  const name2 = parsed.name2 || partsNom.slice(1).join(' ') || (prev.name2 as string | undefined) || ''
  const apellido1 = parsed.apellido1 || partsApe[0] || (prev.apellido1 as string | undefined) || ''
  const apellido2 = parsed.apellido2 || partsApe.slice(1).join(' ') || (prev.apellido2 as string | undefined) || ''

  return {
    ...prev,
    pasaporte: 'C',
    cedula: cedula ? String(cedula).replace(/\s/g, '') : (prev.cedula as string | undefined) || '',
    name1,
    name2,
    apellido1,
    apellido2,
    ...(parsed.fechanac && isValidDdMmYyyy(parsed.fechanac) ? { fechanac: parsed.fechanac } : {}),
    ...(parsed.sexo === 'M' || parsed.sexo === 'F' ? { sexo: parsed.sexo } : {}),
    ...(parsed.nacionalidad ? { nacionalidad: parsed.nacionalidad } : {}),
  }
}

export function mapParsedToRegisterFields<T extends {
  full_name: string
  national_id: string
  birth_date: string
}>(prev: T, parsed: CedulaQrParsed): T {
  const fullName = buildFullNameFromParsed(parsed)
  const nationalId =
    parsed.cedula ||
    parsed.Cedula ||
    parsed.ID ||
    parsed.id ||
    parsed.rawSegment1 ||
    prev.national_id
  const birthDate =
    parsed.fechanac && isValidDdMmYyyy(parsed.fechanac) ? parsed.fechanac : prev.birth_date

  return {
    ...prev,
    full_name: fullName || prev.full_name,
    national_id: nationalId ? String(nationalId).replace(/\s/g, '') : prev.national_id,
    birth_date: birthDate,
  }
}
