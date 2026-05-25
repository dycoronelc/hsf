"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREADMISSION_QR_CID = void 0;
exports.preadmissionQrPayload = preadmissionQrPayload;
exports.buildPreadmissionQrEmailParts = buildPreadmissionQrEmailParts;
const QRCode = require("qrcode");
exports.PREADMISSION_QR_CID = 'preadmission-qr@hospitalsantafe';
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
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
      <div style="text-align: center; margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <p style="font-weight: 600; margin: 0 0 12px; color: #1f2937;">Presente este QR al llegar al hospital</p>
        <img src="cid:${exports.PREADMISSION_QR_CID}" alt="Código QR de llegada" width="280" height="280"
          style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
        <p style="font-family: monospace; font-size: 14px; color: #374151; margin: 12px 0 0;">${escapeHtml(payload)}</p>
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