/** Reglas de longitud del número local (sin prefijo país). */
const LOCAL_LENGTH: Record<string, { min: number; max: number; label: string }> = {
  '507': { min: 7, max: 8, label: 'Panamá (+507)' },
  '506': { min: 8, max: 8, label: 'Costa Rica (+506)' },
  '57': { min: 10, max: 10, label: 'Colombia (+57)' },
  '1': { min: 10, max: 10, label: 'USA/Canadá (+1)' },
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function validatePhoneNumber(
  prefix: string | undefined,
  localNumber: string,
): { valid: boolean; message?: string } {
  const p = (prefix || '507').replace(/^\+/, '')
  const digits = digitsOnly(localNumber)

  if (!digits) {
    return { valid: false, message: 'Ingrese el número de teléfono' }
  }

  const rule = LOCAL_LENGTH[p]
  if (!rule) {
    if (digits.length < 7 || digits.length > 15) {
      return { valid: false, message: 'Número de teléfono inválido (7 a 15 dígitos)' }
    }
    return { valid: true }
  }

  if (digits.length < rule.min || digits.length > rule.max) {
    return {
      valid: false,
      message: `Para ${rule.label} el número debe tener ${rule.min === rule.max ? rule.min : `${rule.min}-${rule.max}`} dígitos`,
    }
  }

  if (p === '507' && digits.startsWith('0')) {
    return { valid: false, message: 'En Panamá no use 0 inicial; ingrese el número local (ej. 6123-4567)' }
  }

  return { valid: true }
}
