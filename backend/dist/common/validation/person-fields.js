"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROBABLE_ATTENTION_DATE_PAST_MESSAGE = exports.BIRTH_DATE_AGE_MESSAGE = exports.BIRTH_DATE_FUTURE_MESSAGE = exports.BIRTH_DATE_FORMAT_MESSAGE = exports.DOCUMENT_ID_MESSAGE = exports.PERSON_NAME_MESSAGE = exports.MAX_PERSON_AGE_YEARS = exports.DD_MM_YYYY_PATTERN = exports.DOCUMENT_ID_INPUT_PATTERN = exports.PERSON_NAME_OPTIONAL_PATTERN = exports.PERSON_NAME_PATTERN = void 0;
exports.filterPersonNameInput = filterPersonNameInput;
exports.filterDocumentIdInput = filterDocumentIdInput;
exports.isValidPersonName = isValidPersonName;
exports.isValidDocumentIdInput = isValidDocumentIdInput;
exports.parseDdMmYyyy = parseDdMmYyyy;
exports.isValidDdMmYyyy = isValidDdMmYyyy;
exports.validateBirthDateDdMmYyyy = validateBirthDateDdMmYyyy;
exports.isValidBirthDateDdMmYyyy = isValidBirthDateDdMmYyyy;
exports.getBirthDateValidationMessage = getBirthDateValidationMessage;
exports.validateProbableAttentionDateDdMmYyyy = validateProbableAttentionDateDdMmYyyy;
exports.isValidProbableAttentionDateDdMmYyyy = isValidProbableAttentionDateDdMmYyyy;
exports.getProbableAttentionDateValidationMessage = getProbableAttentionDateValidationMessage;
exports.PERSON_NAME_PATTERN = /^[\p{L}\s'-]+$/u;
exports.PERSON_NAME_OPTIONAL_PATTERN = /^[\p{L}\s'-]*$/u;
exports.DOCUMENT_ID_INPUT_PATTERN = /^[\p{L}\d-]+$/u;
exports.DD_MM_YYYY_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
exports.MAX_PERSON_AGE_YEARS = 120;
exports.PERSON_NAME_MESSAGE = 'Solo letras, espacios, apóstrofes y guiones';
exports.DOCUMENT_ID_MESSAGE = 'Solo letras, números y guiones';
exports.BIRTH_DATE_FORMAT_MESSAGE = 'La fecha debe tener formato DD/MM/YYYY válido';
exports.BIRTH_DATE_FUTURE_MESSAGE = 'La fecha de nacimiento no puede ser futura';
exports.BIRTH_DATE_AGE_MESSAGE = `La fecha de nacimiento no es razonable (máximo ${exports.MAX_PERSON_AGE_YEARS} años)`;
exports.PROBABLE_ATTENTION_DATE_PAST_MESSAGE = 'La fecha probable de atención no puede ser anterior a hoy';
function filterPersonNameInput(value) {
    return value.replace(/[^\p{L}\s'-]/gu, '');
}
function filterDocumentIdInput(value) {
    return value.replace(/[^\p{L}\d-]/gu, '');
}
function isValidPersonName(value, options) {
    const trimmed = value.trim();
    if (!trimmed)
        return options?.allowEmpty === true;
    return exports.PERSON_NAME_PATTERN.test(trimmed);
}
function isValidDocumentIdInput(value) {
    const trimmed = value.replace(/\s+/g, '').trim();
    if (!trimmed)
        return false;
    return exports.DOCUMENT_ID_INPUT_PATTERN.test(trimmed);
}
function parseDdMmYyyy(value) {
    if (!value?.trim())
        return null;
    const match = value.trim().match(exports.DD_MM_YYYY_PATTERN);
    if (!match)
        return null;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
    }
    return date;
}
function isValidDdMmYyyy(value) {
    return parseDdMmYyyy(value) !== null;
}
function validateBirthDateDdMmYyyy(value, referenceDate = new Date()) {
    const date = parseDdMmYyyy(value);
    if (!date) {
        return { valid: false, message: exports.BIRTH_DATE_FORMAT_MESSAGE };
    }
    const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    if (date > today) {
        return { valid: false, message: exports.BIRTH_DATE_FUTURE_MESSAGE };
    }
    const oldestAllowed = new Date(today);
    oldestAllowed.setFullYear(oldestAllowed.getFullYear() - exports.MAX_PERSON_AGE_YEARS);
    if (date < oldestAllowed) {
        return { valid: false, message: exports.BIRTH_DATE_AGE_MESSAGE };
    }
    return { valid: true };
}
function isValidBirthDateDdMmYyyy(value, referenceDate) {
    return validateBirthDateDdMmYyyy(value, referenceDate).valid;
}
function getBirthDateValidationMessage(value, referenceDate) {
    const result = validateBirthDateDdMmYyyy(value, referenceDate);
    if (!result.valid)
        return result.message;
    return null;
}
function validateProbableAttentionDateDdMmYyyy(value, referenceDate = new Date()) {
    const date = parseDdMmYyyy(value);
    if (!date) {
        return { valid: false, message: exports.BIRTH_DATE_FORMAT_MESSAGE };
    }
    const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    if (date < today) {
        return { valid: false, message: exports.PROBABLE_ATTENTION_DATE_PAST_MESSAGE };
    }
    return { valid: true };
}
function isValidProbableAttentionDateDdMmYyyy(value, referenceDate) {
    return validateProbableAttentionDateDdMmYyyy(value, referenceDate).valid;
}
function getProbableAttentionDateValidationMessage(value, referenceDate) {
    const result = validateProbableAttentionDateDdMmYyyy(value, referenceDate);
    if (!result.valid)
        return result.message;
    return null;
}
//# sourceMappingURL=person-fields.js.map