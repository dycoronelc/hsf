import { formatPanamaCedulaFromDocumentNumber } from './parse-cedula-qr';

/** Formato canónico para guardar y buscar documentos de identidad. */
export function normalizeDocumentId(raw: string, tipoIdentificacion: string): string {
  const trimmed = raw.replace(/\s+/g, '').trim();
  if (!trimmed) return '';
  const tipo = tipoIdentificacion.trim().toUpperCase();
  if (tipo === 'P') return trimmed.toUpperCase();
  return formatPanamaCedulaFromDocumentNumber(trimmed);
}

export function compactDocumentId(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
}

/** Variantes compactas (sin guiones) para emparejar E-8-157481 con 8-157481, etc. */
export function documentIdLookupCompacts(raw: string, tipoIdentificacion: string): string[] {
  const normalized = normalizeDocumentId(raw, tipoIdentificacion);
  const compacts = new Set<string>();
  if (normalized) compacts.add(compactDocumentId(normalized));
  if (raw.trim()) compacts.add(compactDocumentId(raw));
  const eMatch = normalized.match(/^E-(\d)-(.+)$/i);
  if (eMatch) {
    compacts.add(compactDocumentId(`${eMatch[1]}-${eMatch[2]}`));
  }
  return [...compacts].filter(Boolean);
}
