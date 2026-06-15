/** Reglas compartidas de nombres, documentos y fechas de nacimiento (frontend + backend). */
/** Mantener sincronizado con backend/src/common/validation/person-fields.ts */

export const PERSON_NAME_PATTERN = /^[\p{L}\s'-]+$/u
export const PERSON_NAME_OPTIONAL_PATTERN = /^[\p{L}\s'-]*$/u
export const DOCUMENT_ID_INPUT_PATTERN = /^[\p{L}\d-]+$/u
export const DD_MM_YYYY_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

export const MAX_PERSON_AGE_YEARS = 120

export const PERSON_NAME_MESSAGE = 'Solo letras, espacios, apóstrofes y guiones'
export const DOCUMENT_ID_MESSAGE = 'Solo letras, números y guiones'
export const BIRTH_DATE_FORMAT_MESSAGE = 'La fecha debe tener formato DD/MM/YYYY válido'
export const BIRTH_DATE_FUTURE_MESSAGE = 'La fecha de nacimiento no puede ser futura'
export const BIRTH_DATE_AGE_MESSAGE = `La fecha de nacimiento no es razonable (máximo ${MAX_PERSON_AGE_YEARS} años)`

export function filterPersonNameInput(value: string): string {
  return value.replace(/[^\p{L}\s'-]/gu, '')
}

export function filterDocumentIdInput(value: string): string {
  return value.replace(/[^\p{L}\d-]/gu, '')
}

export function isValidPersonName(value: string, options?: { allowEmpty?: boolean }): boolean {
  const trimmed = value.trim()
  if (!trimmed) return options?.allowEmpty === true
  return PERSON_NAME_PATTERN.test(trimmed)
}

export function isValidDocumentIdInput(value: string): boolean {
  const trimmed = value.replace(/\s+/g, '').trim()
  if (!trimmed) return false
  return DOCUMENT_ID_INPUT_PATTERN.test(trimmed)
}

export function parseDdMmYyyy(value: string): Date | null {
  if (!value?.trim()) return null
  const match = value.trim().match(DD_MM_YYYY_PATTERN)
  if (!match) return null
  const day = parseInt(match[1]!, 10)
  const month = parseInt(match[2]!, 10) - 1
  const year = parseInt(match[3]!, 10)
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }
  return date
}

export function isValidDdMmYyyy(value: string): boolean {
  return parseDdMmYyyy(value) !== null
}

export type BirthDateValidation =
  | { valid: true; message?: undefined }
  | { valid: false; message: string }

export function validateBirthDateDdMmYyyy(
  value: string,
  referenceDate: Date = new Date(),
): BirthDateValidation {
  const date = parseDdMmYyyy(value)
  if (!date) {
    return { valid: false, message: BIRTH_DATE_FORMAT_MESSAGE }
  }

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  )
  if (date > today) {
    return { valid: false, message: BIRTH_DATE_FUTURE_MESSAGE }
  }

  const oldestAllowed = new Date(today)
  oldestAllowed.setFullYear(oldestAllowed.getFullYear() - MAX_PERSON_AGE_YEARS)
  if (date < oldestAllowed) {
    return { valid: false, message: BIRTH_DATE_AGE_MESSAGE }
  }

  return { valid: true }
}

export function isValidBirthDateDdMmYyyy(value: string, referenceDate?: Date): boolean {
  return validateBirthDateDdMmYyyy(value, referenceDate).valid
}

export function getBirthDateValidationMessage(value: string, referenceDate?: Date): string | null {
  const result = validateBirthDateDdMmYyyy(value, referenceDate);
  if (!result.valid) return result.message;
  return null;
}
