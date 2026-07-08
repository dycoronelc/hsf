"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREADMISSION_QR_CID = void 0;
exports.preadmissionQrPayload = preadmissionQrPayload;
exports.buildPreadmissionQrEmailParts = buildPreadmissionQrEmailParts;
const QRCode = require("qrcode");
const email_template_util_1 = require("./email-template.util");
exports.PREADMISSION_QR_CID = 'preadmission-qr@hospitalsantafe';
function preadmissionQrPayload(qrCode, preadmissionId) {
    const trimmed = qrCode?.trim();
    return trimmed || String(preadmissionId);
}
async function buildPreadmissionQrEmailParts(payload) {
    const buffer = await QRCode.toBuffer(payload, {
        type: 'png',
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'M',
    });
    return {
        htmlBlock: `
      <div style="text-align:center;margin:24px 0;padding:24px 16px;background:linear-gradient(180deg,#f0f9f7 0%,#ffffff 100%);border:1px solid #dbe7e3;border-radius:12px;">
        <p style="font-weight:700;margin:0 0 16px;color:#00816D;font-size:15px;">Presente este QR al llegar al hospital</p>
        <img src="cid:${exports.PREADMISSION_QR_CID}" alt="Código QR de llegada" width="280" height="280"
          style="display:block;margin:0 auto;max-width:100%;height:auto;border:8px solid #ffffff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);" />
        <p style="font-family:Consolas,Monaco,'Courier New',monospace;font-size:14px;color:#374151;margin:16px 0 0;padding:10px 12px;background:#f9fafb;border-radius:8px;display:inline-block;">${(0, email_template_util_1.escapeHtml)(payload)}</p>
      </div>`,
        attachments: [
            {
                filename: 'qr-llegada.png',
                content: buffer,
                cid: exports.PREADMISSION_QR_CID,
            },
        ],
    };
}
//# sourceMappingURL=qr-email.util.js.map