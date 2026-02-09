export enum UserRole {
  PATIENT = 'patient',
  RECEPTION = 'reception',
  TECHNICIAN = 'technician',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  AUDITOR = 'auditor',
}

export enum TicketStatus {
  CREADO = 'creado',
  CHECK_IN = 'check_in',
  EN_COLA = 'en_cola',
  LLAMADO = 'llamado',
  EN_ATENCION = 'en_atencion',
  FINALIZADO = 'finalizado',
  NO_SHOW = 'no_show',
  CANCELADO = 'cancelado',
  DERIVADO = 'derivado',
}

export enum Priority {
  NORMAL = 'normal',
  CITA = 'cita',
  ADULTO_MAYOR = 'adulto_mayor',
  EMBARAZO = 'embarazo',
  DISCAPACIDAD = 'discapacidad',
  EMERGENCIA = 'emergencia',
}

export enum PreadmissionStatus {
  BORRADOR = 'borrador',
  ENVIADO = 'enviado',
  EN_REVISION = 'en_revision',
  ACEPTADO = 'aceptado',
  RECHAZADO = 'rechazado',
  REQUIERE_SUBSANACION = 'requiere_subsanacion',
}
