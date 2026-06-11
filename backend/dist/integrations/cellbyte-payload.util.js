"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreadmissionUploadRoot = getPreadmissionUploadRoot;
exports.readStoredAttachmentBase64 = readStoredAttachmentBase64;
exports.formatCellbytePhone = formatCellbytePhone;
exports.buildCellbytePayload = buildCellbytePayload;
const fs_1 = require("fs");
const path = require("path");
function getPreadmissionUploadRoot() {
    const configured = process.env.PREADMISSION_UPLOAD_DIR?.trim();
    return configured
        ? path.resolve(configured)
        : path.resolve(process.cwd(), 'uploads', 'preadmissions');
}
function isLegacyBase64Stored(value) {
    if (value.includes('/') || value.includes('\\'))
        return false;
    return value.startsWith('data:') || value.length > 512;
}
function readStoredAttachmentBase64(stored) {
    if (!stored)
        return '';
    if (isLegacyBase64Stored(stored)) {
        const match = stored.match(/^data:[^;]+;base64,(.+)$/);
        if (match)
            return match[1];
        return stored;
    }
    const root = getPreadmissionUploadRoot();
    const normalized = stored.replace(/\\/g, '/');
    if (normalized.includes('..'))
        return '';
    const absolute = path.join(root, normalized);
    const rootResolved = path.resolve(root);
    const fileResolved = path.resolve(absolute);
    if (!fileResolved.startsWith(rootResolved) || !(0, fs_1.existsSync)(fileResolved)) {
        return '';
    }
    return (0, fs_1.readFileSync)(fileResolved).toString('base64');
}
function formatDdMmYyyy(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
function formatCellbytePhone(celular, prefix) {
    let normalized = celular.replace(/\s/g, '');
    if (normalized.startsWith('+'))
        normalized = normalized.slice(1);
    const countryPrefix = (prefix || '507').replace(/^\+/, '');
    if (normalized.startsWith(countryPrefix)) {
        normalized = normalized.slice(countryPrefix.length);
    }
    return normalized.replace(/^\+/, '');
}
function buildCellbytePayload(p) {
    return {
        departamento: p.departamento,
        name1: p.name1,
        name2: p.name2 ?? '',
        apellido1: p.apellido1,
        apellido2: p.apellido2 ?? '',
        pasaporte: p.pasaporte,
        cedula: p.cedula,
        sexo: p.sexo,
        fechanac: p.fechanac,
        nacionalidad: p.nacionalidad,
        estadocivil: p.estadocivil,
        tiposangre: p.tiposangre,
        email: p.email,
        celular: formatCellbytePhone(p.celular, p.celularPrefix),
        provincia1: p.provincia1,
        distrito1: p.distrito1,
        corregimiento1: p.corregimiento1,
        direccion1: p.direccion1,
        encasourgencia: p.encasourgencia,
        relacion: p.relacion,
        email3: p.email3,
        celular3: formatCellbytePhone(p.celular3, '507'),
        provincia3: p.provincia3 ?? '',
        distrito3: p.distrito3 ?? '',
        corregimiento3: p.corregimiento3 ?? '',
        direccion3: p.direccion3 ?? '',
        medico: p.medico ?? '',
        doblecobertura: p.doblecobertura,
        compania1: p.doblecobertura === 'SI' ? (p.compania1 ?? '') : '',
        poliza1: p.doblecobertura === 'SI' ? (p.poliza1 ?? '') : '',
        cedulaimagen: readStoredAttachmentBase64(p.cedulaimagen),
        ordenimagen: readStoredAttachmentBase64(p.ordenimagen),
        ssimagen: readStoredAttachmentBase64(p.ssimagen),
        fechapreadmision: formatDdMmYyyy(p.fechapreadmision),
    };
}
//# sourceMappingURL=cellbyte-payload.util.js.map