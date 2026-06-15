"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCellbytePhone = formatCellbytePhone;
exports.buildCellbytePayload = buildCellbytePayload;
exports.buildCellbyteAttachmentWarnings = buildCellbyteAttachmentWarnings;
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
function buildCellbytePayload(p, attachments) {
    return {
        departamento: p.departamento,
        name1: p.name1,
        name2: p.name2 ?? '',
        apellido1: p.apellido1,
        apellido2: p.apellido2 ?? '',
        pasaporte: p.pasaporte,
        cedula: (p.cedula ?? '').trim(),
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
        cedulaimagen: attachments.cedulaimagen,
        ordenimagen: attachments.ordenimagen,
        ssimagen: attachments.ssimagen,
        fechapreadmision: formatDdMmYyyy(p.fechapreadmision),
    };
}
function buildCellbyteAttachmentWarnings(preadmission, attachments) {
    const warnings = [];
    const checks = [
        { field: 'cedulaimagen', label: 'Imagen de cédula (cedulaimagen)' },
        { field: 'ordenimagen', label: 'Orden médica (ordenimagen)' },
        { field: 'ssimagen', label: 'Imagen SS (ssimagen)' },
    ];
    for (const { field, label } of checks) {
        const stored = preadmission[field];
        if (stored && !attachments[field]) {
            warnings.push(`${label}: hay ruta en BD (${stored}) pero el archivo no está en disco. En Railway configure un volumen persistente en PREADMISSION_UPLOAD_DIR o vuelva a registrar la preadmisión con adjuntos.`);
        }
    }
    if (!(preadmission.cedula ?? '').trim()) {
        warnings.push('Número de cédula vacío en la preadmisión.');
    }
    return warnings;
}
//# sourceMappingURL=cellbyte-payload.util.js.map