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

const YMD_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Interpreta `yyyy-mm-dd` como día calendario en America/Panama.
 * Evita el bug de `new Date('yyyy-mm-dd')` (= medianoche UTC).
 */
export function panamaDayStart(ymd: string): Date | null {
  const m = String(ymd || '').trim().match(YMD_REGEX);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000${APP_TIMEZONE_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Fin inclusivo del día calendario Panamá (23:59:59.999-05:00). */
export function panamaDayEnd(ymd: string): Date | null {
  const m = String(ymd || '').trim().match(YMD_REGEX);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T23:59:59.999${APP_TIMEZONE_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Día calendario actual en America/Panama como `yyyy-mm-dd`. */
export function panamaTodayYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = part(parts, 'year');
  const m = part(parts, 'month');
  const d = part(parts, 'day');
  return `${y}-${m}-${d}`;
}

export type ReportDateRange = { start: Date; end: Date };

/**
 * Rango de reporte: fechas `yyyy-mm-dd` = días completos en Panamá.
 * Si faltan, usa `defaultDays` hacia atrás desde hoy (Panamá) hasta ahora.
 */
export function resolveReportDateRange(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  defaultDays = 30,
): ReportDateRange {
  let start: Date | null = null;
  let end: Date | null = null;

  if (typeof startDate === 'string') {
    start = panamaDayStart(startDate);
  } else if (startDate instanceof Date && !Number.isNaN(startDate.getTime())) {
    start = startDate;
  }

  if (typeof endDate === 'string') {
    end = panamaDayEnd(endDate);
  } else if (endDate instanceof Date && !Number.isNaN(endDate.getTime())) {
    end = endDate;
  }

  if (!end) {
    end = new Date();
  }
  if (!start) {
    const today = panamaTodayYmd(end);
    const endOfToday = panamaDayEnd(today) ?? end;
    start = new Date(endOfToday.getTime() - defaultDays * 24 * 60 * 60 * 1000);
    const fallbackStart = panamaDayStart(panamaTodayYmd(start));
    if (fallbackStart) start = fallbackStart;
  }

  if (start.getTime() > end.getTime()) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  return { start, end };
}
