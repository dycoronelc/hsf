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

export type HostWorkListItem = {
  id: number;
  name1: string;
  apellido1: string;
  cedula: string;
  departamento: string;
  arrivalState: string;
  fechapreadmision: Date;
  ticketId: number | null;
};

/** Lista anfitrión: solo campos necesarios, sin relaciones ni adjuntos. */
export function toHostWorkListItem(entity: Preadmission): HostWorkListItem {
  return {
    id: entity.id,
    name1: entity.name1,
    apellido1: entity.apellido1,
    cedula: entity.cedula,
    departamento: entity.departamento,
    arrivalState: entity.arrivalState,
    fechapreadmision: entity.fechapreadmision,
    ticketId: entity.ticketId ?? null,
  };
}

/** Respuesta de búsqueda / listados sin rutas internas de disco */
export function toPreadmissionSummary(entity: Preadmission) {
  const {
    cedulaimagen,
    ordenimagen,
    preautorizacion,
    carnetseguro,
    certificadoSeguro,
    ssimagen,
    patient,
    confirmedArrivalBy,
    ...rest
  } = entity;
  void cedulaimagen;
  void ordenimagen;
  void preautorizacion;
  void carnetseguro;
  void certificadoSeguro;
  void ssimagen;
  void patient;
  void confirmedArrivalBy;
  return rest;
}
