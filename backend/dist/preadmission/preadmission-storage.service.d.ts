import { StreamableFile } from '@nestjs/common';
import { PreadmissionAttachmentField } from './preadmission-attachments.constants';
import { PreadmissionUploadedFilesMap } from './preadmission-upload.types';
export type SavedAttachmentPaths = Partial<Record<PreadmissionAttachmentField, string>>;
export declare class PreadmissionStorageService {
    private readonly logger;
    private readonly uploadRoot;
    constructor();
    isAttachmentField(field: string): field is PreadmissionAttachmentField;
    isLegacyBase64Stored(value: string | null | undefined): boolean;
    getAbsolutePath(relativePath: string): string;
    saveAttachments(preadmissionId: number, files: PreadmissionUploadedFilesMap): SavedAttachmentPaths;
    openForDownload(stored: string | null | undefined, field: PreadmissionAttachmentField): {
        stream: StreamableFile;
        mime: string;
        filename: string;
    };
    readAsBase64(stored: string | null | undefined): string;
    getUploadRoot(): string;
    private legacyBase64Stream;
    private extensionFor;
    private mimeFromPath;
}
export declare function resolvePreadmissionUploadRoot(): string;
