import { BadRequestException } from '@nestjs/common';

const PDF = Buffer.from('%PDF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);

function startsWith(buf: Buffer, sig: Buffer): boolean {
  return buf.length >= sig.length && buf.subarray(0, sig.length).equals(sig);
}

export type AllowedAttachmentKind = 'image/jpeg' | 'image/png' | 'application/pdf';

export function detectAttachmentKind(buffer: Buffer): AllowedAttachmentKind | null {
  if (!buffer.length) return null;
  if (startsWith(buffer, PDF)) return 'application/pdf';
  if (startsWith(buffer, PNG)) return 'image/png';
  if (startsWith(buffer, JPEG)) return 'image/jpeg';
  return null;
}

export function assertValidAttachmentBuffer(buffer: Buffer, declaredMime: string): AllowedAttachmentKind {
  if (!buffer?.length) {
    throw new BadRequestException('El archivo está vacío o corrupto');
  }

  const detected = detectAttachmentKind(buffer);
  if (!detected) {
    throw new BadRequestException('Formato no permitido. Use PNG, JPG o PDF válidos');
  }

  const normalizedDeclared = declaredMime.toLowerCase();
  const jpegAliases = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg']);
  if (detected === 'image/jpeg' && jpegAliases.has(normalizedDeclared)) {
    return detected;
  }
  if (detected !== normalizedDeclared) {
    throw new BadRequestException('El contenido del archivo no coincide con su formato declarado');
  }

  return detected;
}
