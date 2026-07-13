export const PREADMISSION_ATTACHMENT_FIELDS = [
  'cedulaimagen',
  'ordenimagen',
  'preautorizacion',
  'carnetseguro',
  'certificadoSeguro',
  'ssimagen',
] as const;

export type PreadmissionAttachmentField = (typeof PREADMISSION_ATTACHMENT_FIELDS)[number];

export const REQUIRED_ATTACHMENT_FIELDS: PreadmissionAttachmentField[] = ['cedulaimagen', 'ordenimagen'];

export const ALLOWED_ATTACHMENT_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]);

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
