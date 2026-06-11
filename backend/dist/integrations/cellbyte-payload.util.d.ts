import { Preadmission } from '../preadmission/entities/preadmission.entity';
export declare function getPreadmissionUploadRoot(): string;
export declare function readStoredAttachmentBase64(stored: string | null | undefined): string;
export declare function formatCellbytePhone(celular: string, prefix?: string | null): string;
export declare function buildCellbytePayload(p: Preadmission): Record<string, string>;
