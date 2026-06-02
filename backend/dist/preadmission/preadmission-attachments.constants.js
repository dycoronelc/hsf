"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_ATTACHMENT_BYTES = exports.ALLOWED_ATTACHMENT_MIME = exports.REQUIRED_ATTACHMENT_FIELDS = exports.PREADMISSION_ATTACHMENT_FIELDS = void 0;
exports.PREADMISSION_ATTACHMENT_FIELDS = [
    'cedulaimagen',
    'ordenimagen',
    'preautorizacion',
    'carnetseguro',
    'certificadoSeguro',
    'ssimagen',
];
exports.REQUIRED_ATTACHMENT_FIELDS = ['cedulaimagen'];
exports.ALLOWED_ATTACHMENT_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
]);
exports.MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
//# sourceMappingURL=preadmission-attachments.constants.js.map