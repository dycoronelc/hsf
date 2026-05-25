import * as QRCode from 'qrcode';
import type { Attachment } from 'nodemailer/lib/mailer';

export const PREADMISSION_QR_CID = 'preadmission-qr@hospitalsantafe';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
      <div style="text-align: center; margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <p style="font-weight: 600; margin: 0 0 12px; color: #1f2937;">Presente este QR al llegar al hospital</p>
        <img src="cid:${PREADMISSION_QR_CID}" alt="Código QR de llegada" width="280" height="280"
          style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
        <p style="font-family: monospace; font-size: 14px; color: #374151; margin: 12px 0 0;">${escapeHtml(payload)}</p>
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
