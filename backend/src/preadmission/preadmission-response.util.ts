import { Preadmission } from './entities/preadmission.entity';
import {
  PREADMISSION_ATTACHMENT_FIELDS,
  PreadmissionAttachmentField,
} from './preadmission-attachments.constants';

export type PreadmissionAttachmentUrls = Partial<
  Record<PreadmissionAttachmentField, string | null>
>;

export type PreadmissionResponse = Omit<Preadmission, never> & {
  attachmentUrls: PreadmissionAttachmentUrls;
};

export function toPreadmissionResponse(entity: Preadmission): PreadmissionResponse {
  const attachmentUrls: PreadmissionAttachmentUrls = {};
  for (const field of PREADMISSION_ATTACHMENT_FIELDS) {
    const stored = entity[field];
    attachmentUrls[field] = stored
      ? `/api/preadmission/${entity.id}/attachments/${field}`
      : null;
  }
  return { ...entity, attachmentUrls };
}

/** Respuesta de búsqueda / listados sin rutas internas de disco */
export function toPreadmissionSummary(entity: Preadmission) {
  const { cedulaimagen, ordenimagen, preautorizacion, carnetseguro, certificadoSeguro, ssimagen, ...rest } =
    entity;
  void cedulaimagen;
  void ordenimagen;
  void preautorizacion;
  void carnetseguro;
  void certificadoSeguro;
  void ssimagen;
  return rest;
}
