"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPreadmissionResponse = toPreadmissionResponse;
exports.toHostWorkListItem = toHostWorkListItem;
exports.toPreadmissionSummary = toPreadmissionSummary;
const preadmission_attachments_constants_1 = require("./preadmission-attachments.constants");
function toPreadmissionResponse(entity) {
    const attachmentUrls = {};
    for (const field of preadmission_attachments_constants_1.PREADMISSION_ATTACHMENT_FIELDS) {
        const stored = entity[field];
        attachmentUrls[field] = stored
            ? `/api/preadmission/${entity.id}/attachments/${field}`
            : null;
    }
    return { ...entity, attachmentUrls };
}
function toHostWorkListItem(entity) {
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
function toPreadmissionSummary(entity) {
    const { cedulaimagen, ordenimagen, preautorizacion, carnetseguro, certificadoSeguro, ssimagen, patient, confirmedArrivalBy, ...rest } = entity;
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
//# sourceMappingURL=preadmission-response.util.js.map