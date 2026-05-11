export declare enum UserRole {
    PATIENT = "patient",
    RECEPTION = "reception",
    TECHNICIAN = "technician",
    ANFITRION = "anfitrion",
    OFICIAL_ADMISION = "oficial_admision",
    SUPERVISOR = "supervisor",
    ADMIN = "admin",
    LABORATORIO = "laboratorio",
    RADIOLOGIA = "radiologia",
    AUDITOR = "auditor"
}
export declare enum AgentState {
    EN_LINEA = "en_linea",
    MANUAL = "manual",
    FUERA_DE_LINEA = "fuera_de_linea",
    ALMUERZO = "almuerzo",
    BANO = "bano",
    DOCUMENTANDO = "documentando"
}
export declare enum TicketStatus {
    CREADO = "creado",
    CHECK_IN = "check_in",
    EN_COLA = "en_cola",
    LLAMADO = "llamado",
    EN_ATENCION = "en_atencion",
    FINALIZADO = "finalizado",
    NO_SHOW = "no_show",
    CANCELADO = "cancelado",
    DERIVADO = "derivado",
    TRANSFERIDO = "transferido"
}
export declare enum PreadmissionArrivalState {
    REGISTRADO = "registrado",
    ESPERA_LLEGADA = "espera_llegada",
    PACIENTE_PRESENTE = "paciente_presente",
    TICKET_GENERADO = "ticket_generado"
}
export declare enum Priority {
    NORMAL = "normal",
    CITA = "cita",
    ADULTO_MAYOR = "adulto_mayor",
    EMBARAZO = "embarazo",
    DISCAPACIDAD = "discapacidad",
    EMERGENCIA = "emergencia"
}
export declare enum ServicePriorityLevel {
    PRIORIDAD_1 = 1,
    PRIORIDAD_2 = 2,
    PRIORIDAD_3 = 3
}
export declare enum RegistradoComo {
    PACIENTE = "paciente",
    ACOMPANANTE = "acompanante"
}
export declare enum PreadmissionStatus {
    BORRADOR = "borrador",
    ENVIADO = "enviado",
    EN_REVISION = "en_revision",
    ACEPTADO = "aceptado",
    RECHAZADO = "rechazado",
    REQUIERE_SUBSANACION = "requiere_subsanacion"
}
