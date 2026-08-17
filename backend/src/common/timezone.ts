/** Zona horaria operativa del hospital (Panamá, UTC-5 todo el año, sin DST). */
export const APP_TIMEZONE = 'America/Panama';

export function toIsoUtc(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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
