"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAttachmentKind = detectAttachmentKind;
exports.assertValidAttachmentBuffer = assertValidAttachmentBuffer;
const common_1 = require("@nestjs/common");
const PDF = Buffer.from('%PDF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
function startsWith(buf, sig) {
    return buf.length >= sig.length && buf.subarray(0, sig.length).equals(sig);
}
function detectAttachmentKind(buffer) {
    if (!buffer.length)
        return null;
    if (startsWith(buffer, PDF))
        return 'application/pdf';
    if (startsWith(buffer, PNG))
        return 'image/png';
    if (startsWith(buffer, JPEG))
        return 'image/jpeg';
    return null;
}
function assertValidAttachmentBuffer(buffer, declaredMime) {
    if (!buffer?.length) {
        throw new common_1.BadRequestException('El archivo está vacío o corrupto');
    }
    const detected = detectAttachmentKind(buffer);
    if (!detected) {
        throw new common_1.BadRequestException('Formato no permitido. Use PNG, JPG o PDF válidos');
    }
    const normalizedDeclared = declaredMime.toLowerCase();
    const jpegAliases = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg']);
    if (detected === 'image/jpeg' && jpegAliases.has(normalizedDeclared)) {
        return detected;
    }
    if (detected !== normalizedDeclared) {
        throw new common_1.BadRequestException('El contenido del archivo no coincide con su formato declarado');
    }
    return detected;
}
//# sourceMappingURL=file-signature.util.js.map