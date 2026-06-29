export declare const PERSON_NAME_PATTERN: RegExp;
export declare const PERSON_NAME_OPTIONAL_PATTERN: RegExp;
export declare const DOCUMENT_ID_INPUT_PATTERN: RegExp;
export declare const DD_MM_YYYY_PATTERN: RegExp;
export declare const MAX_PERSON_AGE_YEARS = 120;
export declare const PERSON_NAME_MESSAGE = "Solo letras, espacios, ap\u00F3strofes y guiones";
export declare const DOCUMENT_ID_MESSAGE = "Solo letras, n\u00FAmeros y guiones";
export declare const BIRTH_DATE_FORMAT_MESSAGE = "La fecha debe tener formato DD/MM/YYYY v\u00E1lido";
export declare const BIRTH_DATE_FUTURE_MESSAGE = "La fecha de nacimiento no puede ser futura";
export declare const BIRTH_DATE_AGE_MESSAGE = "La fecha de nacimiento no es razonable (m\u00E1ximo 120 a\u00F1os)";
export declare const PROBABLE_ATTENTION_DATE_PAST_MESSAGE = "La fecha probable de atenci\u00F3n no puede ser anterior a hoy";
export declare function filterPersonNameInput(value: string): string;
export declare function filterDocumentIdInput(value: string): string;
export declare function isValidPersonName(value: string, options?: {
    allowEmpty?: boolean;
}): boolean;
export declare function isValidDocumentIdInput(value: string): boolean;
export declare function parseDdMmYyyy(value: string): Date | null;
export declare function isValidDdMmYyyy(value: string): boolean;
export type BirthDateValidation = {
    valid: true;
    message?: undefined;
} | {
    valid: false;
    message: string;
};
export declare function validateBirthDateDdMmYyyy(value: string, referenceDate?: Date): BirthDateValidation;
export declare function isValidBirthDateDdMmYyyy(value: string, referenceDate?: Date): boolean;
export declare function getBirthDateValidationMessage(value: string, referenceDate?: Date): string | null;
export type ProbableAttentionDateValidation = {
    valid: true;
    message?: undefined;
} | {
    valid: false;
    message: string;
};
export declare function validateProbableAttentionDateDdMmYyyy(value: string, referenceDate?: Date): ProbableAttentionDateValidation;
export declare function isValidProbableAttentionDateDdMmYyyy(value: string, referenceDate?: Date): boolean;
export declare function getProbableAttentionDateValidationMessage(value: string, referenceDate?: Date): string | null;
