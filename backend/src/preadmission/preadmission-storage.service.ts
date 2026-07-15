import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import {
  ALLOWED_ATTACHMENT_MIME,
  MAX_ATTACHMENT_BYTES,
  PREADMISSION_ATTACHMENT_FIELDS,
  PreadmissionAttachmentField,
  REQUIRED_ATTACHMENT_FIELDS,
} from './preadmission-attachments.constants';
import { PreadmissionUploadedFilesMap } from './preadmission-upload.types';
import { resolveEffectiveAttachmentMime } from '../common/file-signature.util';

export type SavedAttachmentPaths = Partial<Record<PreadmissionAttachmentField, string>>;

@Injectable()
export class PreadmissionStorageService {
  private readonly logger = new Logger(PreadmissionStorageService.name);
  private readonly uploadRoot: string;

  constructor() {
    this.uploadRoot = resolvePreadmissionUploadRoot();
    mkdirSync(this.uploadRoot, { recursive: true });
    this.logger.log(`Adjuntos de preadmisión: ${this.uploadRoot}`);
  }

  isAttachmentField(field: string): field is PreadmissionAttachmentField {
    return (PREADMISSION_ATTACHMENT_FIELDS as readonly string[]).includes(field);
  }

  isLegacyBase64Stored(value: string | null | undefined): boolean {
    if (!value) return false;
    if (value.includes('/') || value.includes('\\')) return false;
    return value.startsWith('data:') || value.length > 512;
  }

  getAbsolutePath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/');
    if (normalized.includes('..')) {
      throw new BadRequestException('Ruta de archivo inválida');
    }
    const absolute = path.join(this.uploadRoot, normalized);
    const rootResolved = path.resolve(this.uploadRoot);
    const fileResolved = path.resolve(absolute);
    if (!fileResolved.startsWith(rootResolved)) {
      throw new BadRequestException('Ruta de archivo inválida');
    }
    return fileResolved;
  }

  saveAttachments(
    preadmissionId: number,
    files: PreadmissionUploadedFilesMap,
  ): SavedAttachmentPaths {
    const dirRelative = String(preadmissionId);
    const dirAbsolute = path.join(this.uploadRoot, dirRelative);
    mkdirSync(dirAbsolute, { recursive: true });

    const paths: SavedAttachmentPaths = {};

    for (const field of PREADMISSION_ATTACHMENT_FIELDS) {
      const file = files[field]?.[0];
      if (!file?.buffer?.length) continue;

      const verifiedKind = resolveEffectiveAttachmentMime(file.buffer, file.mimetype);
      if (!ALLOWED_ATTACHMENT_MIME.has(verifiedKind)) {
        throw new BadRequestException(
          `Tipo de archivo no permitido en ${field}. Solo PNG, JPG y PDF`,
        );
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new BadRequestException(
          `El archivo ${field} supera el tamaño máximo de 15 MB`,
        );
      }

      const ext = this.extensionFor(verifiedKind, file.originalname);
      const filename = `${field}${ext}`;
      const relative = path.join(dirRelative, filename).replace(/\\/g, '/');
      const absolute = path.join(dirAbsolute, filename);
      writeFileSync(absolute, file.buffer);
      paths[field] = relative;
    }

    for (const required of REQUIRED_ATTACHMENT_FIELDS) {
      if (!paths[required]) {
        throw new BadRequestException('La imagen de cédula es obligatoria');
      }
    }

    return paths;
  }

  openForDownload(
    stored: string | null | undefined,
    field: PreadmissionAttachmentField,
  ): { stream: StreamableFile; mime: string; filename: string } {
    if (!stored) {
      throw new NotFoundException('Archivo no encontrado');
    }

    if (this.isLegacyBase64Stored(stored)) {
      return this.legacyBase64Stream(stored, field);
    }

    const absolute = this.getAbsolutePath(stored);
    if (!existsSync(absolute)) {
      throw new NotFoundException('Archivo no encontrado en el servidor');
    }

    const mime = this.mimeFromPath(absolute);
    const filename = path.basename(absolute);
    return {
      stream: new StreamableFile(createReadStream(absolute), { type: mime }),
      mime,
      filename,
    };
  }

  /** Base64 sin prefijo data: para integración Cellbyte. */
  readAsBase64(stored: string | null | undefined): string {
    if (!stored) return '';

    if (this.isLegacyBase64Stored(stored)) {
      const match = stored.match(/^data:[^;]+;base64,(.+)$/);
      if (match) return match[1];
      return stored;
    }

    const absolute = this.getAbsolutePath(stored);
    if (!existsSync(absolute)) {
      return '';
    }

    return readFileSync(absolute).toString('base64');
  }

  getUploadRoot(): string {
    return this.uploadRoot;
  }

  private legacyBase64Stream(
    stored: string,
    field: PreadmissionAttachmentField,
  ): { stream: StreamableFile; mime: string; filename: string } {
    let mime = 'application/octet-stream';
    let base64 = stored;

    const match = stored.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mime = match[1];
      base64 = match[2];
    } else if (stored.startsWith('/9j/')) {
      mime = 'image/jpeg';
    } else if (stored.startsWith('iVBOR')) {
      mime = 'image/png';
    } else if (stored.startsWith('JVBER')) {
      mime = 'application/pdf';
    }

    const buffer = Buffer.from(base64, 'base64');
    const ext = this.extensionFor(mime, field);
    return {
      stream: new StreamableFile(buffer, { type: mime }),
      mime,
      filename: `${field}${ext}`,
    };
  }

  private extensionFor(mime: string, originalName?: string): string {
    const fromName = originalName ? path.extname(originalName).toLowerCase() : '';
    if (fromName && fromName.length <= 5) return fromName;
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

  private mimeFromPath(filePath: string): string {
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
}

/** Raíz de adjuntos: env explícita, volumen Railway, o carpeta por defecto bajo cwd. */
export function resolvePreadmissionUploadRoot(): string {
  const configured =
    process.env.PREADMISSION_UPLOAD_DIR?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  return configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), 'uploads', 'preadmissions');
}
