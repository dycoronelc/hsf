"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreadmissionStatus = exports.Priority = exports.TicketStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["PATIENT"] = "patient";
    UserRole["RECEPTION"] = "reception";
    UserRole["TECHNICIAN"] = "technician";
    UserRole["SUPERVISOR"] = "supervisor";
    UserRole["ADMIN"] = "admin";
    UserRole["AUDITOR"] = "auditor";
})(UserRole || (exports.UserRole = UserRole = {}));
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
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var Priority;
(function (Priority) {
    Priority["NORMAL"] = "normal";
    Priority["CITA"] = "cita";
    Priority["ADULTO_MAYOR"] = "adulto_mayor";
    Priority["EMBARAZO"] = "embarazo";
    Priority["DISCAPACIDAD"] = "discapacidad";
    Priority["EMERGENCIA"] = "emergencia";
})(Priority || (exports.Priority = Priority = {}));
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