/**
 * Parser del contenido del QR de datos personales de la cédula panameña (reverso, lado legible).
 *
 * El Tribunal Electoral no publica de forma abierta el layout binario; la prensa y documentación
 * de integración en el país describen un QR con los mismos datos del frente en forma tabular.
 * En la práctica el payload suele ser texto con campos separados por | (y en algunos lectores, TAB).
 *
 * Layout principal soportado (12 campos, índices 0–11):
 *   cédula | primer apellido | segundo apellido | nombre(s) | sexo | lugar nacimiento |
 *   fecha nacimiento | nacionalidad | donante | fecha expedición | fecha vencimiento | cadena verificación
 *
 * Variante frecuente en carné de residente y algunas cédulas (sexo en índice 3):
 *   cédula | nombre(s) | apellidos | sexo | lugar nacimiento | ...
 *
 * Carné de residente permanente (campo vacío entre apellidos y sexo, sexo en índice 4):
 *   cédula | nombre(s) | apellidos | (vacío) | sexo | lugar nacimiento | fecha nac | nacionalidad | ... | fexp | fvenc | verif
 *
 * Variante con apellidos separados antes del sexo (sexo en índice 4):
 *   cédula | nombre(s) | primer apellido | segundo apellido | sexo | ...
 *
 * Variante compacta (10 campos): sin donante ni verificación, o con donante omitido — ver tryTeTableLayout.
 *
 * Si el formato cambia, ajustar índices aquí o ampliar variantes; se mantienen JSON y heurísticas legacy.
 *
 * Ejemplo sintético (12 campos, solo ilustrativo):
 *   8-123-456|GARCIA|LOPEZ|JUAN CARLOS|M|PANAMA|15/03/1990|PANAMEÑO|NO|01/01/2020|01/01/2030|VERIFHASH
 */

/** Cédula completa alfanumérica TE (merlos/cedula-panama, forma normalizada con guiones). */
const CEDULA_COMPLETA_RE =
  /^(?:PE|AE|E|N|[23456789](?:AV|PI)?|1[0123]?(?:AV|PI)?)-\d{1,4}-\d{1,6}$/i;

const MRZ_LINE_RE = /^[A-Z0-9<]{25,}$/;

const DATE_DMY_RE = /^(\d{2})[/-](\d{2})[/-](\d{4})$/;
const DATE_YMD_RE = /^(\d{4})[/-](\d{2})[/-](\d{2})$/;

function normalizeCedulaToken(s: string): string {
  return s.replace(/\s+/g, '').trim();
}

export function formatPanamaCedulaFromDocumentNumber(doc: string): string {
  const t = normalizeCedulaToken(doc).replace(/</g, '').toUpperCase();
  if (!t) return t;
  if (CEDULA_COMPLETA_RE.test(t)) return t;
  if (/^AE\d{5,}$/.test(t)) {
    const digits = t.slice(2);
    return `AE-${digits.slice(0, digits.length - 4)}-${digits.slice(-4)}`;
  }
  if (/^E\d{6,9}$/.test(t)) {
    const digits = t.slice(1);
    return `E-${digits.slice(0, 1)}-${digits.slice(1)}`;
  }
  if (/^\d{7,12}$/.test(t)) {
    const digits = t;
    if (digits.length >= 9) {
      return `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4)}`;
    }
    if (digits.length >= 7) {
      return `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4)}`;
    }
  }
  return t;
}

function parseMrzBirthDate(yymmdd: string): string {
  if (!/^\d{6}$/.test(yymmdd)) return '';
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const currentYear = new Date().getFullYear() % 100;
  const century = yy > currentYear ? 1900 : 2000;
  return `${dd}/${mm}/${String(century + yy).padStart(4, '0')}`;
}

function parseMrzNames(line3: string): {
  apellido1: string;
  apellido2: string;
  nombres: string;
  name1: string;
  name2: string;
} {
  const clean = line3.replace(/<+$/, '');
  const [surnamesPart = '', givenPart = ''] = clean.split('<<');
  const surnames = surnamesPart.split('<').filter(Boolean);
  const given = givenPart.replace(/<+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const apellido1 = surnames[0] ?? '';
  const apellido2 = surnames.slice(1).join(' ');
  const nombres = given.join(' ');
  const name1 = given[0] ?? '';
  const name2 = given.slice(1).join(' ');
  return { apellido1, apellido2, nombres, name1, name2 };
}

function parseIcaoMrz(raw: string): Record<string, string> | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim().toUpperCase())
    .filter((line) => MRZ_LINE_RE.test(line));
  if (lines.length < 3) return null;

  const [line1, line2, line3] = lines.slice(-3);
  if (line1.slice(2, 5) !== 'PAN') return null;

  let documentNumber = '';
  for (let i = 5; i < line1.length; i++) {
    const c = line1[i];
    if (c === '<') break;
    documentNumber += c;
  }
  if (!documentNumber) return null;

  const birthRaw = line2.slice(0, 6);
  const sex = line2[7] ?? '';
  const nationality = line2.slice(15, 18).replace(/<+/g, '').trim();
  const names = parseMrzNames(line3);

  return {
    cedula: formatPanamaCedulaFromDocumentNumber(documentNumber),
    apellido1: names.apellido1,
    apellido2: names.apellido2,
    apellidos: [names.apellido1, names.apellido2].filter(Boolean).join(' ').trim(),
    nombres: names.nombres,
    name1: names.name1,
    name2: names.name2,
    sexo: normalizeSexo(sex),
    fechanac: parseMrzBirthDate(birthRaw),
    nacionalidad: nationality,
    _qrFormat: 'icao_mrz',
  };
}

export function looksLikePanamaCedula(s: string): boolean {
  const token = normalizeCedulaToken(s);
  if (CEDULA_COMPLETA_RE.test(token)) return true;
  return /^(?:AE|E|PE|N)\d{5,}$/i.test(token) || /^\d{7,13}$/.test(token);
}

function normalizeDateToDdMmYyyy(s: string): string {
  const t = s.trim();
  let m = t.match(DATE_DMY_RE);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  m = t.match(DATE_YMD_RE);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return t;
}

function normalizeSexo(s: string): string {
  const u = s.trim().toUpperCase();
  if (u === 'M' || u === 'MASCULINO' || u === 'MASC' || u === 'H' || u === 'HOMBRE') return 'M';
  if (u === 'F' || u === 'FEMENINO' || u === 'FEM' || u === 'MUJER') return 'F';
  return s.trim().slice(0, 1).toUpperCase() === 'F' ? 'F' : 'M';
}

function splitNombresToName12(nombres: string): { name1: string; name2: string } {
  const parts = nombres.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name1: '', name2: '' };
  if (parts.length === 1) return { name1: parts[0], name2: '' };
  return { name1: parts[0], name2: parts.slice(1).join(' ') };
}

function splitApellidosToAp12(apellidos: string): { apellido1: string; apellido2: string } {
  const parts = apellidos.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { apellido1: '', apellido2: '' };
  if (parts.length === 1) return { apellido1: parts[0], apellido2: '' };
  return { apellido1: parts[0], apellido2: parts.slice(1).join(' ') };
}

type TeLayout = 'apellidos_first' | 'nombres_first_split' | 'nombres_first_combined';

function isSexToken(s: string): boolean {
  const u = s.trim().toUpperCase();
  return /^[MF]$/.test(u) || u === 'MASCULINO' || u === 'FEMENINO';
}

function isBlankField(s: string): boolean {
  return !s.trim();
}

function isDateLike(s: string): boolean {
  const t = s.trim();
  return DATE_DMY_RE.test(t) || DATE_YMD_RE.test(t);
}

function findCombinedLayoutSexIdx(f: string[]): number {
  if (isSexToken(f[3] ?? '')) return 3;
  if (isSexToken(f[4] ?? '') && isBlankField(f[3] ?? '')) return 4;
  return -1;
}

/** Detecta si el sexo está en [3] (nombres|apellidos|sexo) o en [4] (apellidos|nombres o nombres|ap1|ap2). */
function detectTeLayout(f: string[]): TeLayout {
  const combinedSexIdx = findCombinedLayoutSexIdx(f);
  if (combinedSexIdx >= 0 && !isBlankField(f[1] ?? '') && !isBlankField(f[2] ?? '')) {
    return 'nombres_first_combined';
  }
  if (f.length >= 11 && isSexToken(f[4] ?? '')) {
    const f1 = (f[1] ?? '').trim().split(/\s+/).filter(Boolean).length;
    const f2 = (f[2] ?? '').trim().split(/\s+/).filter(Boolean).length;
    const f3 = (f[3] ?? '').trim().split(/\s+/).filter(Boolean).length;
    if (f1 >= 2 && f2 === 1 && f3 === 1) {
      return 'nombres_first_split';
    }
    if (!isBlankField(f[3] ?? '')) {
      return 'apellidos_first';
    }
  }
  return 'apellidos_first';
}

type TeNameFields = {
  nombres: string;
  apellido1: string;
  apellido2: string;
  name1: string;
  name2: string;
  apellidos: string;
};

function extractTeTailFields(
  f: string[],
  fromIdx: number,
): { donante: string; fechaExp: string; fechaVenc: string; verificacion: string } {
  const dateIndices: number[] = [];
  for (let i = fromIdx; i < f.length; i++) {
    if (isDateLike(f[i] ?? '')) dateIndices.push(i);
  }

  let fechaExp = '';
  let fechaVenc = '';
  let verificacion = '';
  let donante = '';

  if (dateIndices.length >= 2) {
    fechaExp = (f[dateIndices[dateIndices.length - 2]] ?? '').trim();
    fechaVenc = (f[dateIndices[dateIndices.length - 1]] ?? '').trim();
    for (let i = dateIndices[dateIndices.length - 1] + 1; i < f.length; i++) {
      const v = (f[i] ?? '').trim();
      if (v) verificacion = v;
    }
  } else if (dateIndices.length === 1) {
    fechaVenc = (f[dateIndices[0]] ?? '').trim();
  }

  const firstDateIdx = dateIndices[0] ?? f.length;
  for (let i = fromIdx; i < firstDateIdx; i++) {
    const v = (f[i] ?? '').trim();
    if (v && !isDateLike(v)) {
      donante = v;
      break;
    }
  }

  return { donante, fechaExp, fechaVenc, verificacion };
}

function extractTeNameFields(layout: TeLayout, f: string[]): { names: TeNameFields; sexIdx: number } {
  if (layout === 'nombres_first_combined') {
    const sexIdx = findCombinedLayoutSexIdx(f);
    const nombres = (f[1] ?? '').trim();
    const apellidosRaw = (f[2] ?? '').trim();
    const { apellido1, apellido2 } = splitApellidosToAp12(apellidosRaw);
    const { name1, name2 } = splitNombresToName12(nombres);
    return {
      sexIdx: sexIdx >= 0 ? sexIdx : 3,
      names: {
        nombres,
        apellido1,
        apellido2,
        name1,
        name2,
        apellidos: apellidosRaw || [apellido1, apellido2].filter(Boolean).join(' ').trim(),
      },
    };
  }
  if (layout === 'nombres_first_split') {
    const nombres = (f[1] ?? '').trim();
    const apellido1 = (f[2] ?? '').trim();
    const apellido2 = (f[3] ?? '').trim();
    const { name1, name2 } = splitNombresToName12(nombres);
    return {
      sexIdx: 4,
      names: {
        nombres,
        apellido1,
        apellido2,
        name1,
        name2,
        apellidos: [apellido1, apellido2].filter(Boolean).join(' ').trim(),
      },
    };
  }
  const apellido1 = (f[1] ?? '').trim();
  const apellido2 = (f[2] ?? '').trim();
  const nombres = (f[3] ?? '').trim();
  const { name1, name2 } = splitNombresToName12(nombres);
  return {
    sexIdx: 4,
    names: {
      nombres,
      apellido1,
      apellido2,
      name1,
      name2,
      apellidos: [apellido1, apellido2].filter(Boolean).join(' ').trim(),
    },
  };
}

/** Intenta mapear tablas TE de 10–12 columnas (primera columna = cédula). */
function tryTeTableLayout(fields: string[]): Record<string, string> | null {
  const f = fields.map((x) => x.trim());
  if (f.length < 10 || !looksLikePanamaCedula(f[0])) return null;

  const layout = detectTeLayout(f);
  const { names, sexIdx } = extractTeNameFields(layout, f);
  const n = f.length;

  const sexo = f[sexIdx] ?? '';
  const lugarNac = f[sexIdx + 1] ?? '';
  const fechaNac = f[sexIdx + 2] ?? '';
  const nacionalidad = f[sexIdx + 3] ?? '';

  let donante = '';
  let fechaExp = '';
  let fechaVenc = '';
  let verificacion = '';
  let formatSuffix = '';
  const tailStart = sexIdx + 4;

  if (layout === 'nombres_first_combined' && n > 11) {
    const tail = extractTeTailFields(f, tailStart);
    donante = tail.donante;
    fechaExp = tail.fechaExp;
    fechaVenc = tail.fechaVenc;
    verificacion = tail.verificacion;
    formatSuffix = `${n}_nombres_combined`;
  } else if (layout === 'nombres_first_combined') {
    if (n >= 12) {
      donante = f[sexIdx + 4] ?? '';
      fechaExp = f[sexIdx + 5] ?? '';
      fechaVenc = f[sexIdx + 6] ?? '';
      verificacion = f.slice(sexIdx + 7).join('|');
      formatSuffix = '12_nombres_combined';
    } else if (n === 11) {
      donante = f[sexIdx + 4] ?? '';
      fechaExp = f[sexIdx + 5] ?? '';
      fechaVenc = f[sexIdx + 6] ?? '';
      verificacion = (f[sexIdx + 7] ?? '').trim();
      formatSuffix = '11_nombres_combined';
    } else if (n === 10) {
      fechaExp = f[sexIdx + 4] ?? '';
      fechaVenc = f[sexIdx + 5] ?? '';
      verificacion = (f[sexIdx + 6] ?? '').trim();
      formatSuffix = '10_nombres_combined';
    }
  } else if (n > 11) {
    const tail = extractTeTailFields(f, tailStart);
    donante = tail.donante;
    fechaExp = tail.fechaExp;
    fechaVenc = tail.fechaVenc;
    verificacion = tail.verificacion;
    formatSuffix =
      layout === 'nombres_first_split' ? `${n}_nombres_split` : `${n}_std`;
  } else if (n >= 12) {
    donante = f[8] ?? '';
    fechaExp = f[9] ?? '';
    fechaVenc = f[10] ?? '';
    verificacion = f.slice(11).join('|');
    formatSuffix = layout === 'nombres_first_split' ? '12_nombres_split' : '12';
  } else if (n === 11) {
    donante = f[8] ?? '';
    fechaExp = f[9] ?? '';
    fechaVenc = f[10] ?? '';
    formatSuffix = layout === 'nombres_first_split' ? '11_nombres_split' : '11';
  } else if (n === 10) {
    fechaExp = f[8] ?? '';
    fechaVenc = f[9] ?? '';
    formatSuffix = layout === 'nombres_first_split' ? '10_nombres_split' : '10';
  }

  if (!formatSuffix) return null;

  return {
    cedula: normalizeCedulaToken(f[0]),
    apellido1: names.apellido1,
    apellido2: names.apellido2,
    apellidos: names.apellidos,
    nombres: names.nombres,
    name1: names.name1,
    name2: names.name2,
    sexo: normalizeSexo(sexo),
    lugarNacimiento: lugarNac,
    fechanac: normalizeDateToDdMmYyyy(fechaNac),
    nacionalidad: nacionalidad.trim(),
    ...(donante ? { donante: donante.trim() } : {}),
    fechaExpedicion: normalizeDateToDdMmYyyy(fechaExp),
    fechaVencimiento: normalizeDateToDdMmYyyy(fechaVenc),
    ...(verificacion ? { verificacion: verificacion.trim() } : {}),
    _qrFormat: `te_pipe_${formatSuffix}`,
  };
}

/**
 * Variante: cédula | nombre completo (apellidos + nombres en un solo campo) | sexo | lugar | fnac | nac | donante | fexp | fvenc | verif
 * (10 campos). Se detecta si [1] no parece apellido aislado y [2] es sexo.
 */
function tryTeCompactNameLayout(fields: string[]): Record<string, string> | null {
  const f = fields.map((x) => x.trim());
  if (f.length !== 10 || !looksLikePanamaCedula(f[0])) return null;
  const sexCandidate = f[2].toUpperCase();
  const isSex =
    /^[MF]$/.test(sexCandidate) ||
    sexCandidate === 'MASCULINO' ||
    sexCandidate === 'FEMENINO';
  if (!isSex) return null;
  // Si el campo 1 tiene forma "APELLIDO APELLIDO NOMBRE" (3+ tokens), asumir layout compacto
  const tokens = f[1].split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;

  const [
    cedula,
    nombreCompleto,
    sexo,
    lugarNac,
    fechaNac,
    nacionalidad,
    donante,
    fechaExp,
    fechaVenc,
    verif,
  ] = f;

  // Heurística española: dos primeros tokens = apellidos, resto = nombres
  const apellido1 = tokens[0];
  const apellido2 = tokens[1] ?? '';
  const nombresRest = tokens.slice(2).join(' ');
  const { name1, name2 } = splitNombresToName12(nombresRest);

  return {
    cedula: normalizeCedulaToken(cedula),
    nombreCompletoTe: nombreCompleto,
    apellido1,
    apellido2,
    apellidos: `${apellido1} ${apellido2}`.trim(),
    nombres: nombresRest,
    name1,
    name2,
    sexo: normalizeSexo(sexo),
    lugarNacimiento: lugarNac,
    fechanac: normalizeDateToDdMmYyyy(fechaNac),
    nacionalidad: nacionalidad.trim(),
    donante: donante.trim(),
    fechaExpedicion: normalizeDateToDdMmYyyy(fechaExp),
    fechaVencimiento: normalizeDateToDdMmYyyy(fechaVenc),
    verificacion: verif.trim(),
    _qrFormat: 'te_pipe_compact_name',
  };
}

function splitTeFields(raw: string): string[] {
  const t = raw.trim();
  if (t.includes('|')) {
    return t.split('|').map((p) => p.trim());
  }
  if (t.includes('\t')) {
    return t.split(/\t+/).map((p) => p.trim());
  }
  if (t.includes(';') && t.split(';').length >= 8) {
    return t.split(';').map((p) => p.trim());
  }
  return [];
}

function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function kvMatchKey(normKey: string, ...patterns: string[]): boolean {
  for (const p of patterns) {
    if (normKey.includes(normalizeLabel(p))) return true;
  }
  return false;
}

function parseKeyValueLines(raw: string): Record<string, string> | null {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;
  const kv: Record<string, string> = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k && v) kv[normalizeLabel(k)] = v;
  }
  const keys = Object.keys(kv);
  if (keys.length < 3) return null;

  const out: Record<string, string> = { _qrFormat: 'te_key_value_lines' };
  for (const nk of keys) {
    const v = kv[nk];
    if (kvMatchKey(nk, 'cedula', 'documento', 'identificacion', 'numerodocumento')) {
      out.cedula = normalizeCedulaToken(v);
    } else if (kvMatchKey(nk, 'apellido', 'surname')) {
      if (!out.apellidos) out.apellidos = v;
      else out.apellidos = `${out.apellidos} ${v}`.trim();
    } else if (kvMatchKey(nk, 'nombre', 'given', 'prenombres')) {
      out.nombres = out.nombres ? `${out.nombres} ${v}`.trim() : v;
    } else if (kvMatchKey(nk, 'sexo', 'genero')) {
      out.sexo = normalizeSexo(v);
    } else if (kvMatchKey(nk, 'fechanacimiento', 'nacimiento', 'birth')) {
      out.fechanac = normalizeDateToDdMmYyyy(v);
    } else if (kvMatchKey(nk, 'nacionalidad')) {
      out.nacionalidad = v;
    } else if (kvMatchKey(nk, 'lugarnacimiento', 'lugardenacimiento')) {
      out.lugarNacimiento = v;
    }
  }
  if (out.apellidos) {
    const parts = out.apellidos.split(/\s+/).filter(Boolean);
    out.apellido1 = parts[0] ?? '';
    out.apellido2 = parts.slice(1).join(' ');
  }
  if (out.nombres) {
    const { name1, name2 } = splitNombresToName12(out.nombres);
    out.name1 = name1;
    out.name2 = name2;
  }
  if (!out.cedula || !looksLikePanamaCedula(out.cedula)) return null;
  return out;
}

function mapJsonToFlat(o: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = { _qrFormat: 'json' };
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const variants = [k, k.toLowerCase(), k.toUpperCase()];
      for (const vk of variants) {
        if (o[vk] != null && typeof o[vk] !== 'object') {
          return String(o[vk]);
        }
      }
    }
    return '';
  };

  const cedula =
    pick(
      'cedula',
      'Cedula',
      'numeroDocumento',
      'numero_documento',
      'documento',
      'id',
      'identificacion',
    ) || '';
  if (cedula) out.cedula = normalizeCedulaToken(cedula);

  const ap1 = pick('primerApellido', 'apellido1', 'apellido_paterno', 'firstSurname');
  const ap2 = pick('segundoApellido', 'apellido2', 'apellido_materno', 'secondSurname');
  if (ap1) out.apellido1 = ap1;
  if (ap2) out.apellido2 = ap2;
  if (ap1 || ap2) out.apellidos = [ap1, ap2].filter(Boolean).join(' ').trim();

  const nombres = pick('nombres', 'nombre', 'givenNames', 'primerNombre', 'nombresCompletos');
  if (nombres) {
    out.nombres = nombres;
    const { name1, name2 } = splitNombresToName12(nombres);
    out.name1 = name1;
    out.name2 = name2;
  }

  const sexo = pick('sexo', 'genero', 'gender', 'sex');
  if (sexo) out.sexo = normalizeSexo(sexo);

  const fn = pick(
    'fechaNacimiento',
    'fecha_nacimiento',
    'fechanac',
    'birthDate',
    'dateOfBirth',
  );
  if (fn) out.fechanac = normalizeDateToDdMmYyyy(fn);

  const nac = pick('nacionalidad', 'nationality');
  if (nac) out.nacionalidad = nac;

  const lugar = pick('lugarNacimiento', 'lugar_nacimiento', 'birthPlace');
  if (lugar) out.lugarNacimiento = lugar;

  for (const [k, v] of Object.entries(o)) {
    if (v != null && typeof v !== 'object' && !(k in out)) {
      out[k] = String(v);
    }
  }
  return out;
}

/**
 * Extrae campos del texto crudo del QR (o pega desde lector).
 * Prioridad: JSON → tabla TE (| / TAB / ;) → líneas clave:valor → heurística legacy.
 */
export function parseCedulaQr(raw: string): Record<string, string> {
  const t = raw.trim();
  if (!t) return {};

  const mrz = parseIcaoMrz(t);
  if (mrz?.cedula) return mrz;

  try {
    const j = JSON.parse(t) as unknown;
    if (j && typeof j === 'object' && !Array.isArray(j)) {
      return mapJsonToFlat(j as Record<string, unknown>);
    }
  } catch {
    // no es JSON
  }

  const kv = parseKeyValueLines(t);
  if (kv && kv.cedula && looksLikePanamaCedula(kv.cedula)) {
    return kv;
  }

  const fields = splitTeFields(t);
  if (fields.length >= 10) {
    const compact = tryTeCompactNameLayout(fields);
    if (compact) return compact;

    const table = tryTeTableLayout(fields);
    if (table) return table;
  }

  // Una sola línea con muchos pipes pero cédula no en [0]: posible prefijo de versión
  if (fields.length >= 11) {
    for (let i = 1; i <= 3 && i < fields.length - 9; i++) {
      if (looksLikePanamaCedula(fields[i])) {
        const shifted = tryTeTableLayout(fields.slice(i));
        if (shifted) {
          return { ...shifted, _qrSkippedPrefix: fields.slice(0, i).join('|') };
        }
        const shiftedCompact = tryTeCompactNameLayout(fields.slice(i));
        if (shiftedCompact) {
          return { ...shiftedCompact, _qrSkippedPrefix: fields.slice(0, i).join('|') };
        }
      }
    }
  }

  // Legacy: primer campo no es cédula pero algún segmento sí
  const looseParts = t.split(/[|\n;]/).map((p) => p.trim()).filter(Boolean);
  const cedulaPart = looseParts.find((p) => looksLikePanamaCedula(p));
  if (cedulaPart && looseParts.length >= 2) {
    const out: Record<string, string> = {
      cedula: normalizeCedulaToken(cedulaPart),
      _qrFormat: 'legacy_guess',
    };
    const idx = looseParts.indexOf(cedulaPart);
    const segNombres = looseParts[idx + 1]?.trim() ?? '';
    const segApellidos = looseParts[idx + 2]?.trim() ?? '';
    if (segNombres) {
      out.rawSegment1 = segNombres;
      out.nombres = segNombres;
      const { name1, name2 } = splitNombresToName12(segNombres);
      out.name1 = name1;
      out.name2 = name2;
    }
    if (segApellidos) {
      out.rawSegment2 = segApellidos;
      out.apellidos = segApellidos;
      const { apellido1, apellido2 } = splitApellidosToAp12(segApellidos);
      out.apellido1 = apellido1;
      out.apellido2 = apellido2;
    }
    return out;
  }

  if (/^(?:AE|E|\d)[\d-]{5,}$/i.test(normalizeCedulaToken(t))) {
    return {
      cedula: formatPanamaCedulaFromDocumentNumber(t),
      _qrFormat: 'cedula_only',
    };
  }

  return {};
}
