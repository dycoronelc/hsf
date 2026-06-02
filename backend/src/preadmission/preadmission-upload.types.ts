/** Archivo en memoria recibido por multer (FileFieldsInterceptor). */
export interface PreadmissionUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export type PreadmissionUploadedFilesMap = Partial<
  Record<string, PreadmissionUploadedFile[]>
>;
