export enum UserRole {
  PATIENT = 'patient',
  RECEPTION = 'reception', // Oficial de Admisión
  TECHNICIAN = 'technician',
  ANFITRION = 'anfitrion',
  OFICIAL_ADMISION = 'oficial_admision',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  LABORATORIO = 'laboratorio',
  RADIOLOGIA = 'radiologia',
  AUDITOR = 'auditor',
}

/** Estados del agente (documento Preadmision.md). En no operativos no se asignan tickets ni llamados. */
export enum AgentState {
  EN_LINEA = 'en_linea',
  MANUAL = 'manual',
  FUERA_DE_LINEA = 'fuera_de_linea',
  ALMUERZO = 'almuerzo',
  BANO = 'bano',
  DOCUMENTANDO = 'documentando',
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
  /** PDF requisitos: ticket transferido a otra área */
  TRANSFERIDO = 'transferido',
}

/** Estados de llegada del paciente (PDF requisitos – flujo anfitrión) */
export enum PreadmissionArrivalState {
  REGISTRADO = 'registrado',
  ESPERA_LLEGADA = 'espera_llegada',
  PACIENTE_PRESENTE = 'paciente_presente',
  TICKET_GENERADO = 'ticket_generado',
}

export enum Priority {
  NORMAL = 'normal',
  CITA = 'cita',
  ADULTO_MAYOR = 'adulto_mayor',
  EMBARAZO = 'embarazo',
  DISCAPACIDAD = 'discapacidad',
  EMERGENCIA = 'emergencia',
}

/** Nivel de prioridad configurable por tipo de ticket (PDF preadmisiones). */
export enum ServicePriorityLevel {
  PRIORIDAD_1 = 1,
  PRIORIDAD_2 = 2,
  PRIORIDAD_3 = 3,
}

export enum RegistradoComo {
  PACIENTE = 'paciente',
  ACOMPANANTE = 'acompanante',
}

export enum PreadmissionStatus {
  BORRADOR = 'borrador',
  ENVIADO = 'enviado',
  EN_REVISION = 'en_revision',
  ACEPTADO = 'aceptado',
  RECHAZADO = 'rechazado',
  REQUIERE_SUBSANACION = 'requiere_subsanacion',
}
