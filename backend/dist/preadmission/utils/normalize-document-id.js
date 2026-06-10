"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDocumentId = normalizeDocumentId;
exports.compactDocumentId = compactDocumentId;
exports.documentIdLookupCompacts = documentIdLookupCompacts;
const parse_cedula_qr_1 = require("./parse-cedula-qr");
function normalizeDocumentId(raw, tipoIdentificacion) {
    const trimmed = raw.replace(/\s+/g, '').trim();
    if (!trimmed)
        return '';
    const tipo = tipoIdentificacion.trim().toUpperCase();
    if (tipo === 'P')
        return trimmed.toUpperCase();
    return (0, parse_cedula_qr_1.formatPanamaCedulaFromDocumentNumber)(trimmed);
}
function compactDocumentId(raw) {
    return raw.replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
}
function documentIdLookupCompacts(raw, tipoIdentificacion) {
    const normalized = normalizeDocumentId(raw, tipoIdentificacion);
    const compacts = new Set();
    if (normalized)
        compacts.add(compactDocumentId(normalized));
    if (raw.trim())
        compacts.add(compactDocumentId(raw));
    const eMatch = normalized.match(/^E-(\d)-(.+)$/i);
    if (eMatch) {
        compacts.add(compactDocumentId(`${eMatch[1]}-${eMatch[2]}`));
    }
    return [...compacts].filter(Boolean);
}
//# sourceMappingURL=normalize-document-id.js.map