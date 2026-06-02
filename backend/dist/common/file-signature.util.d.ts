export type AllowedAttachmentKind = 'image/jpeg' | 'image/png' | 'application/pdf';
export declare function detectAttachmentKind(buffer: Buffer): AllowedAttachmentKind | null;
export declare function assertValidAttachmentBuffer(buffer: Buffer, declaredMime: string): AllowedAttachmentKind;
