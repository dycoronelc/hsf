import type { Attachment } from 'nodemailer/lib/mailer';
export declare const PREADMISSION_QR_CID = "preadmission-qr@hospitalsantafe";
export declare function preadmissionQrPayload(qrCode: string | null | undefined, preadmissionId: number): string;
export declare function buildPreadmissionQrEmailParts(payload: string): Promise<{
    htmlBlock: string;
    attachments: Attachment[];
}>;
