"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.looksLikePanamaCedula = looksLikePanamaCedula;
exports.parseCedulaQr = parseCedulaQr;
const CEDULA_COMPLETA_RE = /^(?:PE|E|N|[23456789](?:AV|PI)?|1[0123]?(?:AV|PI)?)-\d{1,4}-\d{1,6}$/i;
const DATE_DMY_RE = /^(\d{2})[/-](\d{2})[/-](\d{4})$/;
const DATE_YMD_RE = /^(\d{4})[/-](\d{2})[/-](\d{2})$/;
function normalizeCedulaToken(s) {
    return s.replace(/\s+/g, '').trim();
}
function looksLikePanamaCedula(s) {
    return CEDULA_COMPLETA_RE.test(normalizeCedulaToken(s));
}
function normalizeDateToDdMmYyyy(s) {
    const t = s.trim();
    let m = t.match(DATE_DMY_RE);
    if (m)
        return `${m[1]}/${m[2]}/${m[3]}`;
    m = t.match(DATE_YMD_RE);
    if (m)
        return `${m[3]}/${m[2]}/${m[1]}`;
    return t;
}
function normalizeSexo(s) {
    const u = s.trim().toUpperCase();
    if (u === 'M' || u === 'MASCULINO' || u === 'MASC' || u === 'H' || u === 'HOMBRE')
        return 'M';
    if (u === 'F' || u === 'FEMENINO' || u === 'FEM' || u === 'MUJER')
        return 'F';
    return s.trim().slice(0, 1).toUpperCase() === 'F' ? 'F' : 'M';
}
function splitNombresToName12(nombres) {
    const parts = nombres.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return { name1: '', name2: '' };
    if (parts.length === 1)
        return { name1: parts[0], name2: '' };
    return { name1: parts[0], name2: parts.slice(1).join(' ') };
}
function tryTeTableLayout(fields) {
    const f = fields.map((x) => x.trim());
    if (f.length < 10 || !looksLikePanamaCedula(f[0]))
        return null;
    const n = f.length;
    if (n >= 12) {
        const [cedula, apellido1, apellido2, nombres, sexo, lugarNac, fechaNac, nacionalidad, donante, fechaExp, fechaVenc, ...rest] = f;
        const verificacion = rest.join('|');
        const { name1, name2 } = splitNombresToName12(nombres);
        return {
            cedula: normalizeCedulaToken(cedula),
            apellido1,
            apellido2,
            apellidos: [apellido1, apellido2].filter(Boolean).join(' ').trim(),
            nombres: nombres.trim(),
            name1,
            name2,
            sexo: normalizeSexo(sexo),
            lugarNacimiento: lugarNac,
            fechanac: normalizeDateToDdMmYyyy(fechaNac),
            nacionalidad: nacionalidad.trim(),
            donante: donante.trim(),
            fechaExpedicion: normalizeDateToDdMmYyyy(fechaExp),
            fechaVencimiento: normalizeDateToDdMmYyyy(fechaVenc),
            verificacion: verificacion.trim(),
            _qrFormat: 'te_pipe_12',
        };
    }
    if (n === 11) {
        const [cedula, apellido1, apellido2, nombres, sexo, lugarNac, fechaNac, nacionalidad, donante, fechaExp, fechaVenc,] = f;
        const { name1, name2 } = splitNombresToName12(nombres);
        return {
            cedula: normalizeCedulaToken(cedula),
            apellido1,
            apellido2,
            apellidos: [apellido1, apellido2].filter(Boolean).join(' ').trim(),
            nombres: nombres.trim(),
            name1,
            name2,
            sexo: normalizeSexo(sexo),
            lugarNacimiento: lugarNac,
            fechanac: normalizeDateToDdMmYyyy(fechaNac),
            nacionalidad: nacionalidad.trim(),
            donante: donante.trim(),
            fechaExpedicion: normalizeDateToDdMmYyyy(fechaExp),
            fechaVencimiento: normalizeDateToDdMmYyyy(fechaVenc),
            _qrFormat: 'te_pipe_11',
        };
    }
    if (n === 10) {
        const [cedula, apellido1, apellido2, nombres, sexo, lugarNac, fechaNac, nacionalidad, fechaExp, fechaVenc] = f;
        const { name1, name2 } = splitNombresToName12(nombres);
        return {
            cedula: normalizeCedulaToken(cedula),
            apellido1,
            apellido2,
            apellidos: [apellido1, apellido2].filter(Boolean).join(' ').trim(),
            nombres: nombres.trim(),
            name1,
            name2,
            sexo: normalizeSexo(sexo),
            lugarNacimiento: lugarNac,
            fechanac: normalizeDateToDdMmYyyy(fechaNac),
            nacionalidad: nacionalidad.trim(),
            fechaExpedicion: normalizeDateToDdMmYyyy(fechaExp),
            fechaVencimiento: normalizeDateToDdMmYyyy(fechaVenc),
            _qrFormat: 'te_pipe_10',
        };
    }
    return null;
}
function tryTeCompactNameLayout(fields) {
    const f = fields.map((x) => x.trim());
    if (f.length !== 10 || !looksLikePanamaCedula(f[0]))
        return null;
    const sexCandidate = f[2].toUpperCase();
    const isSex = /^[MF]$/.test(sexCandidate) ||
        sexCandidate === 'MASCULINO' ||
        sexCandidate === 'FEMENINO';
    if (!isSex)
        return null;
    const tokens = f[1].split(/\s+/).filter(Boolean);
    if (tokens.length < 3)
        return null;
    const [cedula, nombreCompleto, sexo, lugarNac, fechaNac, nacionalidad, donante, fechaExp, fechaVenc, verif,] = f;
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
function splitTeFields(raw) {
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
function normalizeLabel(s) {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}
function kvMatchKey(normKey, ...patterns) {
    for (const p of patterns) {
        if (normKey.includes(normalizeLabel(p)))
            return true;
    }
    return false;
}
function parseKeyValueLines(raw) {
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3)
        return null;
    const kv = {};
    for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx === -1)
            continue;
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k && v)
            kv[normalizeLabel(k)] = v;
    }
    const keys = Object.keys(kv);
    if (keys.length < 3)
        return null;
    const out = { _qrFormat: 'te_key_value_lines' };
    for (const nk of keys) {
        const v = kv[nk];
        if (kvMatchKey(nk, 'cedula', 'documento', 'identificacion', 'numerodocumento')) {
            out.cedula = normalizeCedulaToken(v);
        }
        else if (kvMatchKey(nk, 'apellido', 'surname')) {
            if (!out.apellidos)
                out.apellidos = v;
            else
                out.apellidos = `${out.apellidos} ${v}`.trim();
        }
        else if (kvMatchKey(nk, 'nombre', 'given', 'prenombres')) {
            out.nombres = out.nombres ? `${out.nombres} ${v}`.trim() : v;
        }
        else if (kvMatchKey(nk, 'sexo', 'genero')) {
            out.sexo = normalizeSexo(v);
        }
        else if (kvMatchKey(nk, 'fechanacimiento', 'nacimiento', 'birth')) {
            out.fechanac = normalizeDateToDdMmYyyy(v);
        }
        else if (kvMatchKey(nk, 'nacionalidad')) {
            out.nacionalidad = v;
        }
        else if (kvMatchKey(nk, 'lugarnacimiento', 'lugardenacimiento')) {
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
    if (!out.cedula || !looksLikePanamaCedula(out.cedula))
        return null;
    return out;
}
function mapJsonToFlat(o) {
    const out = { _qrFormat: 'json' };
    const pick = (...keys) => {
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
    const cedula = pick('cedula', 'Cedula', 'numeroDocumento', 'numero_documento', 'documento', 'id', 'identificacion') || '';
    if (cedula)
        out.cedula = normalizeCedulaToken(cedula);
    const ap1 = pick('primerApellido', 'apellido1', 'apellido_paterno', 'firstSurname');
    const ap2 = pick('segundoApellido', 'apellido2', 'apellido_materno', 'secondSurname');
    if (ap1)
        out.apellido1 = ap1;
    if (ap2)
        out.apellido2 = ap2;
    if (ap1 || ap2)
        out.apellidos = [ap1, ap2].filter(Boolean).join(' ').trim();
    const nombres = pick('nombres', 'nombre', 'givenNames', 'primerNombre', 'nombresCompletos');
    if (nombres) {
        out.nombres = nombres;
        const { name1, name2 } = splitNombresToName12(nombres);
        out.name1 = name1;
        out.name2 = name2;
    }
    const sexo = pick('sexo', 'genero', 'gender', 'sex');
    if (sexo)
        out.sexo = normalizeSexo(sexo);
    const fn = pick('fechaNacimiento', 'fecha_nacimiento', 'fechanac', 'birthDate', 'dateOfBirth');
    if (fn)
        out.fechanac = normalizeDateToDdMmYyyy(fn);
    const nac = pick('nacionalidad', 'nationality');
    if (nac)
        out.nacionalidad = nac;
    const lugar = pick('lugarNacimiento', 'lugar_nacimiento', 'birthPlace');
    if (lugar)
        out.lugarNacimiento = lugar;
    for (const [k, v] of Object.entries(o)) {
        if (v != null && typeof v !== 'object' && !(k in out)) {
            out[k] = String(v);
        }
    }
    return out;
}
function parseCedulaQr(raw) {
    const t = raw.trim();
    if (!t)
        return {};
    try {
        const j = JSON.parse(t);
        if (j && typeof j === 'object' && !Array.isArray(j)) {
            return mapJsonToFlat(j);
        }
    }
    catch {
    }
    const kv = parseKeyValueLines(t);
    if (kv && kv.cedula && looksLikePanamaCedula(kv.cedula)) {
        return kv;
    }
    const fields = splitTeFields(t);
    if (fields.length >= 10) {
        const compact = tryTeCompactNameLayout(fields);
        if (compact)
            return compact;
        const table = tryTeTableLayout(fields);
        if (table)
            return table;
    }
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
    const looseParts = t.split(/[|\n;]/).map((p) => p.trim()).filter(Boolean);
    const cedulaPart = looseParts.find((p) => looksLikePanamaCedula(p));
    if (cedulaPart && looseParts.length >= 2) {
        const out = {
            cedula: normalizeCedulaToken(cedulaPart),
            _qrFormat: 'legacy_guess',
        };
        const idx = looseParts.indexOf(cedulaPart);
        if (looseParts[idx + 1])
            out.rawSegment1 = looseParts[idx + 1];
        if (looseParts[idx + 2])
            out.rawSegment2 = looseParts[idx + 2];
        return out;
    }
    if (/^\d[\d-]{5,}$/i.test(normalizeCedulaToken(t))) {
        return { cedula: normalizeCedulaToken(t), _qrFormat: 'cedula_only' };
    }
    return {};
}
//# sourceMappingURL=parse-cedula-qr.js.map