/** Zona horaria operativa del hospital (Panamá, UTC-5 todo el año, sin DST). */
export const APP_TIMEZONE = 'America/Panama';
/** Offset fijo de Panamá (sin DST). */
export const APP_TIMEZONE_OFFSET = '-05:00';

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? '';
}

/** ISO-8601 en UTC (con Z). Útil para auditoría / ordenamiento. */
export function toIsoUtc(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * ISO-8601 con offset de Panamá (-05:00), a partir del instante real.
 * Preferible en respuestas de tickets para que la UI no dependa del TZ del navegador.
 */
export function toPanamaOffsetIso(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);

  const y = part(parts, 'year');
  const m = part(parts, 'month');
  const day = part(parts, 'day');
  const h = part(parts, 'hour');
  const min = part(parts, 'minute');
  const s = part(parts, 'second');
  return `${y}-${m}-${day}T${h}:${min}:${s}${APP_TIMEZONE_OFFSET}`;
}

/** Hora 0-23 en America/Panama para reportes (no usar Date#getHours, depende de TZ del proceso). */
export function getHourInAppTimezone(value: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '0';
  return parseInt(hour, 10);
}
