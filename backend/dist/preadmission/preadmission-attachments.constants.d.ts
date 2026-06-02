export declare const PREADMISSION_ATTACHMENT_FIELDS: readonly ["cedulaimagen", "ordenimagen", "preautorizacion", "carnetseguro", "certificadoSeguro", "ssimagen"];
export type PreadmissionAttachmentField = (typeof PREADMISSION_ATTACHMENT_FIELDS)[number];
export declare const REQUIRED_ATTACHMENT_FIELDS: PreadmissionAttachmentField[];
export declare const ALLOWED_ATTACHMENT_MIME: Set<string>;
export declare const MAX_ATTACHMENT_BYTES: number;
