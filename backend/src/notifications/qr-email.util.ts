import * as QRCode from 'qrcode';
import type { Attachment } from 'nodemailer/lib/mailer';
import { escapeHtml } from './email-template.util';

export const PREADMISSION_QR_CID = 'preadmission-qr@hospitalsantafe';

/** Payload escaneable: mismo valor que recepción/kiosco (código hex de preadmisión). */
export function preadmissionQrPayload(qrCode: string | null | undefined, preadmissionId: number): string {
  const trimmed = qrCode?.trim();
  return trimmed || String(preadmissionId);
}

/**
 * Genera PNG del QR para incrustar en correo (cid). Compatible con Gmail vía adjunto inline.
 */
export async function buildPreadmissionQrEmailParts(
  payload: string,
): Promise<{ htmlBlock: string; attachments: Attachment[] }> {
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
        <img src="cid:${PREADMISSION_QR_CID}" alt="Código QR de llegada" width="280" height="280"
          style="display:block;margin:0 auto;max-width:100%;height:auto;border:8px solid #ffffff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);" />
        <p style="font-family:Consolas,Monaco,'Courier New',monospace;font-size:14px;color:#374151;margin:16px 0 0;padding:10px 12px;background:#f9fafb;border-radius:8px;display:inline-block;">${escapeHtml(payload)}</p>
      </div>`,
    attachments: [
      {
        filename: 'qr-llegada.png',
        content: buffer,
        cid: PREADMISSION_QR_CID,
      },
    ],
  };
}
