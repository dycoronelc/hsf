import { Preadmission } from '../preadmission/entities/preadmission.entity';
export type CellbyteAttachmentBase64 = {
    cedulaimagen: string;
    ordenimagen: string;
    ssimagen: string;
};
export declare function formatCellbytePhone(celular: string, prefix?: string | null): string;
export declare function buildCellbytePayload(p: Preadmission, attachments: CellbyteAttachmentBase64): Record<string, string>;
export declare function buildCellbyteAttachmentWarnings(preadmission: Preadmission, attachments: CellbyteAttachmentBase64): string[];
