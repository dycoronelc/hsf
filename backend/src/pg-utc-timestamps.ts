/**
 * node-pg interpreta OID 1114 (timestamp without time zone) con la TZ del proceso.
 * En servidores con TZ=America/Panama, un valor UTC guardado en BD se adelanta ~5 h
 * al mostrar tickets (p. ej. 3:03 P.M. → 8:03 P.M.).
 * Forzamos parseo como UTC independientemente del TZ del OS/systemd.
 */
import { types } from 'pg';

const TIMESTAMP_WITHOUT_TZ = 1114;

types.setTypeParser(TIMESTAMP_WITHOUT_TZ, (value: string) => {
  const raw = String(value).trim();
  if (!raw) return null;
  // "2026-08-25 20:03:00.123" → ISO UTC
  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  if (!/([zZ]|[+-]\d{2}(:\d{2})?)$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
});
