"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PreadmissionStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreadmissionStorageService = void 0;
exports.resolvePreadmissionUploadRoot = resolvePreadmissionUploadRoot;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path = require("path");
const preadmission_attachments_constants_1 = require("./preadmission-attachments.constants");
const file_signature_util_1 = require("../common/file-signature.util");
let PreadmissionStorageService = PreadmissionStorageService_1 = class PreadmissionStorageService {
    constructor() {
        this.logger = new common_1.Logger(PreadmissionStorageService_1.name);
        this.uploadRoot = resolvePreadmissionUploadRoot();
        (0, fs_1.mkdirSync)(this.uploadRoot, { recursive: true });
        this.logger.log(`Adjuntos de preadmisión: ${this.uploadRoot}`);
    }
    isAttachmentField(field) {
        return preadmission_attachments_constants_1.PREADMISSION_ATTACHMENT_FIELDS.includes(field);
    }
    isLegacyBase64Stored(value) {
        if (!value)
            return false;
        if (value.includes('/') || value.includes('\\'))
            return false;
        return value.startsWith('data:') || value.length > 512;
    }
    getAbsolutePath(relativePath) {
        const normalized = relativePath.replace(/\\/g, '/');
        if (normalized.includes('..')) {
            throw new common_1.BadRequestException('Ruta de archivo inválida');
        }
        const absolute = path.join(this.uploadRoot, normalized);
        const rootResolved = path.resolve(this.uploadRoot);
        const fileResolved = path.resolve(absolute);
        if (!fileResolved.startsWith(rootResolved)) {
            throw new common_1.BadRequestException('Ruta de archivo inválida');
        }
        return fileResolved;
    }
    saveAttachments(preadmissionId, files) {
        const dirRelative = String(preadmissionId);
        const dirAbsolute = path.join(this.uploadRoot, dirRelative);
        (0, fs_1.mkdirSync)(dirAbsolute, { recursive: true });
        const paths = {};
        for (const field of preadmission_attachments_constants_1.PREADMISSION_ATTACHMENT_FIELDS) {
            const file = files[field]?.[0];
            if (!file?.buffer?.length)
                continue;
            if (!preadmission_attachments_constants_1.ALLOWED_ATTACHMENT_MIME.has(file.mimetype)) {
                throw new common_1.BadRequestException(`Tipo de archivo no permitido en ${field}. Solo PNG, JPG y PDF`);
            }
            if (file.size > preadmission_attachments_constants_1.MAX_ATTACHMENT_BYTES) {
                throw new common_1.BadRequestException(`El archivo ${field} supera el tamaño máximo de 15 MB`);
            }
            const verifiedKind = (0, file_signature_util_1.assertValidAttachmentBuffer)(file.buffer, file.mimetype);
            const ext = this.extensionFor(verifiedKind, file.originalname);
            const filename = `${field}${ext}`;
            const relative = path.join(dirRelative, filename).replace(/\\/g, '/');
            const absolute = path.join(dirAbsolute, filename);
            (0, fs_1.writeFileSync)(absolute, file.buffer);
            paths[field] = relative;
        }
        for (const required of preadmission_attachments_constants_1.REQUIRED_ATTACHMENT_FIELDS) {
            if (!paths[required]) {
                throw new common_1.BadRequestException('La imagen de cédula es obligatoria');
            }
        }
        return paths;
    }
    openForDownload(stored, field) {
        if (!stored) {
            throw new common_1.NotFoundException('Archivo no encontrado');
        }
        if (this.isLegacyBase64Stored(stored)) {
            return this.legacyBase64Stream(stored, field);
        }
        const absolute = this.getAbsolutePath(stored);
        if (!(0, fs_1.existsSync)(absolute)) {
            throw new common_1.NotFoundException('Archivo no encontrado en el servidor');
        }
        const mime = this.mimeFromPath(absolute);
        const filename = path.basename(absolute);
        return {
            stream: new common_1.StreamableFile((0, fs_1.createReadStream)(absolute), { type: mime }),
            mime,
            filename,
        };
    }
    readAsBase64(stored) {
        if (!stored)
            return '';
        if (this.isLegacyBase64Stored(stored)) {
            const match = stored.match(/^data:[^;]+;base64,(.+)$/);
            if (match)
                return match[1];
            return stored;
        }
        const absolute = this.getAbsolutePath(stored);
        if (!(0, fs_1.existsSync)(absolute)) {
            return '';
        }
        return (0, fs_1.readFileSync)(absolute).toString('base64');
    }
    getUploadRoot() {
        return this.uploadRoot;
    }
    legacyBase64Stream(stored, field) {
        let mime = 'application/octet-stream';
        let base64 = stored;
        const match = stored.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
            mime = match[1];
            base64 = match[2];
        }
        else if (stored.startsWith('/9j/')) {
            mime = 'image/jpeg';
        }
        else if (stored.startsWith('iVBOR')) {
            mime = 'image/png';
        }
        else if (stored.startsWith('JVBER')) {
            mime = 'application/pdf';
        }
        const buffer = Buffer.from(base64, 'base64');
        const ext = this.extensionFor(mime, field);
        return {
            stream: new common_1.StreamableFile(buffer, { type: mime }),
            mime,
            filename: `${field}${ext}`,
        };
    }
    extensionFor(mime, originalName) {
        const fromName = originalName ? path.extname(originalName).toLowerCase() : '';
        if (fromName && fromName.length <= 5)
            return fromName;
        switch (mime) {
            case 'image/jpeg':
            case 'image/jpg':
                return '.jpg';
            case 'image/png':
                return '.png';
            case 'application/pdf':
                return '.pdf';
            default:
                return '.bin';
        }
    }
    mimeFromPath(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.webp':
                return 'image/webp';
            case '.pdf':
                return 'application/pdf';
            default:
                return 'application/octet-stream';
        }
    }
};
exports.PreadmissionStorageService = PreadmissionStorageService;
exports.PreadmissionStorageService = PreadmissionStorageService = PreadmissionStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PreadmissionStorageService);
function resolvePreadmissionUploadRoot() {
    const configured = process.env.PREADMISSION_UPLOAD_DIR?.trim() ||
        process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
    return configured
        ? path.resolve(configured)
        : path.resolve(process.cwd(), 'uploads', 'preadmissions');
}
//# sourceMappingURL=preadmission-storage.service.js.map