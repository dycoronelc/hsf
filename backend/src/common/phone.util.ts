const LOCAL_LENGTH: Record<string, { min: number; max: number; label: string }> = {
  '507': { min: 7, max: 8, label: 'Panamá (+507)' },
  '506': { min: 8, max: 8, label: 'Costa Rica (+506)' },
  '57': { min: 10, max: 10, label: 'Colombia (+57)' },
  '1': { min: 10, max: 10, label: 'USA/Canadá (+1)' },
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function assertValidPhoneNumber(prefix: string | undefined, localNumber: string, fieldLabel: string): void {
  const p = (prefix || '507').replace(/^\+/, '');
  const digits = digitsOnly(localNumber);

  if (!digits) {
    throw new Error(`${fieldLabel}: ingrese el número de teléfono`);
  }

  const rule = LOCAL_LENGTH[p];
  if (rule) {
    if (digits.length < rule.min || digits.length > rule.max) {
      const len =
        rule.min === rule.max ? `${rule.min}` : `${rule.min}-${rule.max}`;
      throw new Error(`${fieldLabel}: para ${rule.label} use ${len} dígitos`);
    }
    if (p === '507' && digits.startsWith('0')) {
      throw new Error(`${fieldLabel}: en Panamá no use 0 inicial`);
    }
    return;
  }

  if (digits.length < 7 || digits.length > 15) {
    throw new Error(`${fieldLabel}: número de teléfono inválido`);
  }
}
