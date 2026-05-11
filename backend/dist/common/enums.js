"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreadmissionStatus = exports.RegistradoComo = exports.ServicePriorityLevel = exports.Priority = exports.PreadmissionArrivalState = exports.TicketStatus = exports.AgentState = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["PATIENT"] = "patient";
    UserRole["RECEPTION"] = "reception";
    UserRole["TECHNICIAN"] = "technician";
    UserRole["ANFITRION"] = "anfitrion";
    UserRole["OFICIAL_ADMISION"] = "oficial_admision";
    UserRole["SUPERVISOR"] = "supervisor";
    UserRole["ADMIN"] = "admin";
    UserRole["LABORATORIO"] = "laboratorio";
    UserRole["RADIOLOGIA"] = "radiologia";
    UserRole["AUDITOR"] = "auditor";
})(UserRole || (exports.UserRole = UserRole = {}));
var AgentState;
(function (AgentState) {
    AgentState["EN_LINEA"] = "en_linea";
    AgentState["MANUAL"] = "manual";
    AgentState["FUERA_DE_LINEA"] = "fuera_de_linea";
    AgentState["ALMUERZO"] = "almuerzo";
    AgentState["BANO"] = "bano";
    AgentState["DOCUMENTANDO"] = "documentando";
})(AgentState || (exports.AgentState = AgentState = {}));
var TicketStatus;
(function (TicketStatus) {
    TicketStatus["CREADO"] = "creado";
    TicketStatus["CHECK_IN"] = "check_in";
    TicketStatus["EN_COLA"] = "en_cola";
    TicketStatus["LLAMADO"] = "llamado";
    TicketStatus["EN_ATENCION"] = "en_atencion";
    TicketStatus["FINALIZADO"] = "finalizado";
    TicketStatus["NO_SHOW"] = "no_show";
    TicketStatus["CANCELADO"] = "cancelado";
    TicketStatus["DERIVADO"] = "derivado";
    TicketStatus["TRANSFERIDO"] = "transferido";
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var PreadmissionArrivalState;
(function (PreadmissionArrivalState) {
    PreadmissionArrivalState["REGISTRADO"] = "registrado";
    PreadmissionArrivalState["ESPERA_LLEGADA"] = "espera_llegada";
    PreadmissionArrivalState["PACIENTE_PRESENTE"] = "paciente_presente";
    PreadmissionArrivalState["TICKET_GENERADO"] = "ticket_generado";
})(PreadmissionArrivalState || (exports.PreadmissionArrivalState = PreadmissionArrivalState = {}));
var Priority;
(function (Priority) {
    Priority["NORMAL"] = "normal";
    Priority["CITA"] = "cita";
    Priority["ADULTO_MAYOR"] = "adulto_mayor";
    Priority["EMBARAZO"] = "embarazo";
    Priority["DISCAPACIDAD"] = "discapacidad";
    Priority["EMERGENCIA"] = "emergencia";
})(Priority || (exports.Priority = Priority = {}));
var ServicePriorityLevel;
(function (ServicePriorityLevel) {
    ServicePriorityLevel[ServicePriorityLevel["PRIORIDAD_1"] = 1] = "PRIORIDAD_1";
    ServicePriorityLevel[ServicePriorityLevel["PRIORIDAD_2"] = 2] = "PRIORIDAD_2";
    ServicePriorityLevel[ServicePriorityLevel["PRIORIDAD_3"] = 3] = "PRIORIDAD_3";
})(ServicePriorityLevel || (exports.ServicePriorityLevel = ServicePriorityLevel = {}));
var RegistradoComo;
(function (RegistradoComo) {
    RegistradoComo["PACIENTE"] = "paciente";
    RegistradoComo["ACOMPANANTE"] = "acompanante";
})(RegistradoComo || (exports.RegistradoComo = RegistradoComo = {}));
var PreadmissionStatus;
(function (PreadmissionStatus) {
    PreadmissionStatus["BORRADOR"] = "borrador";
    PreadmissionStatus["ENVIADO"] = "enviado";
    PreadmissionStatus["EN_REVISION"] = "en_revision";
    PreadmissionStatus["ACEPTADO"] = "aceptado";
    PreadmissionStatus["RECHAZADO"] = "rechazado";
    PreadmissionStatus["REQUIERE_SUBSANACION"] = "requiere_subsanacion";
})(PreadmissionStatus || (exports.PreadmissionStatus = PreadmissionStatus = {}));
//# sourceMappingURL=enums.js.map