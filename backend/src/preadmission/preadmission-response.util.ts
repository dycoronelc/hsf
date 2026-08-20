import { Preadmission } from './entities/preadmission.entity';
import { User } from '../users/entities/user.entity';
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
  fechaprobableatencion: string;
  ticketId: number | null;
};

/** Lista anfitrión: solo campos necesarios, sin relaciones ni adjuntos. */
export function toHostWorkListItem(entity: Preadmission): HostWorkListItem {
  return {
    id: entity.id,
    name1: entity.name1 ?? '',
    apellido1: entity.apellido1 ?? '',
    cedula: entity.cedula ?? '',
    departamento: entity.departamento ?? '',
    arrivalState: entity.arrivalState ?? 'espera_llegada',
    fechapreadmision: entity.fechapreadmision,
    fechaprobableatencion: entity.fechaprobableatencion ?? '',
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

function splitFullName(fullName: string | null | undefined): {
  name1: string;
  name2: string;
  apellido1: string;
  apellido2: string;
} {
  const parts = (fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return { name1: '', name2: '', apellido1: '', apellido2: '' };
  }
  if (parts.length === 1) {
    return { name1: parts[0], name2: '', apellido1: '', apellido2: '' };
  }
  if (parts.length === 2) {
    return { name1: parts[0], name2: '', apellido1: parts[1], apellido2: '' };
  }
  if (parts.length === 3) {
    return { name1: parts[0], name2: '', apellido1: parts[1], apellido2: parts[2] };
  }
  return {
    name1: parts[0],
    name2: parts[1],
    apellido1: parts[2],
    apellido2: parts.slice(3).join(' '),
  };
}

function birthDateToDdMmYyyy(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
  }
  return raw;
}

function phoneDigits(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('507') && digits.length > 8) {
    return digits.slice(3);
  }
  return digits;
}

/**
 * Campos de preadmisión que se pueden rellenar desde el catálogo de usuarios/pacientes.
 * Solo incluye lo que existe en `users` (nombre, documento, correo, teléfono, fecha nac.).
 */
export function toPatientUserSearchSummary(user: User, cedula: string, tipoIdentificacion: string) {
  const names = splitFullName(user.fullName);
  return {
    cedula,
    pasaporte: tipoIdentificacion.trim().toUpperCase(),
    ...names,
    fechanac: birthDateToDdMmYyyy(user.birthDate),
    email: user.email ?? '',
    celular: phoneDigits(user.phone),
    celularPrefix: '507',
    source: 'user' as const,
  };
}
