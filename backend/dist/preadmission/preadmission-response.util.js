"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPreadmissionResponse = toPreadmissionResponse;
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
function toPreadmissionSummary(entity) {
    const { cedulaimagen, ordenimagen, preautorizacion, carnetseguro, certificadoSeguro, ssimagen, ...rest } = entity;
    void cedulaimagen;
    void ordenimagen;
    void preautorizacion;
    void carnetseguro;
    void certificadoSeguro;
    void ssimagen;
    return rest;
}
//# sourceMappingURL=preadmission-response.util.js.map