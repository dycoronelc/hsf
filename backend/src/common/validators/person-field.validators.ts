import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  BIRTH_DATE_FORMAT_MESSAGE,
  isValidBirthDateDdMmYyyy,
  isValidDdMmYyyy,
  isValidDocumentIdInput,
  isValidPersonName,
  isValidProbableAttentionDateDdMmYyyy,
  validateBirthDateDdMmYyyy,
  validateProbableAttentionDateDdMmYyyy,
} from '../validation/person-fields';

@ValidatorConstraint({ name: 'isPersonName', async: false })
export class IsPersonNameConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null || value === '') {
      return args.constraints[0] === true;
    }
    if (typeof value !== 'string') return false;
    return isValidPersonName(value, { allowEmpty: args.constraints[0] === true });
  }

  defaultMessage(): string {
    return 'Solo letras, espacios, apóstrofes y guiones';
  }
}

export function IsPersonName(allowEmpty = false, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [allowEmpty],
      validator: IsPersonNameConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isDocumentIdInput', async: false })
export class IsDocumentIdInputConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value !== 'string') return false;
    return isValidDocumentIdInput(value);
  }

  defaultMessage(): string {
    return 'Documento: solo letras, números y guiones';
  }
}

export function IsDocumentIdInput(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsDocumentIdInputConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isBirthDateDdMmYyyy', async: false })
export class IsBirthDateDdMmYyyyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null || value === '') {
      return args.constraints[0] === true;
    }
    if (typeof value !== 'string') return false;
    return isValidBirthDateDdMmYyyy(value);
  }

  defaultMessage(args: ValidationArguments): string {
    if (typeof args.value !== 'string' || !args.value.trim()) {
      return BIRTH_DATE_FORMAT_MESSAGE;
    }
    const result = validateBirthDateDdMmYyyy(args.value);
    if (!result.valid) return result.message;
    return BIRTH_DATE_FORMAT_MESSAGE;
  }
}

export function IsBirthDateDdMmYyyy(allowEmpty = false, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [allowEmpty],
      validator: IsBirthDateDdMmYyyyConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isDdMmYyyy', async: false })
export class IsDdMmYyyyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null || value === '') {
      return args.constraints[0] === true;
    }
    if (typeof value !== 'string') return false;
    return isValidDdMmYyyy(value);
  }

  defaultMessage(): string {
    return BIRTH_DATE_FORMAT_MESSAGE;
  }
}

export function IsDdMmYyyy(allowEmpty = false, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [allowEmpty],
      validator: IsDdMmYyyyConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isProbableAttentionDateDdMmYyyy', async: false })
export class IsProbableAttentionDateDdMmYyyyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null || value === '') {
      return args.constraints[0] === true;
    }
    if (typeof value !== 'string') return false;
    return isValidProbableAttentionDateDdMmYyyy(value);
  }

  defaultMessage(args: ValidationArguments): string {
    if (typeof args.value !== 'string' || !args.value.trim()) {
      return BIRTH_DATE_FORMAT_MESSAGE;
    }
    const result = validateProbableAttentionDateDdMmYyyy(args.value);
    if (!result.valid) return result.message;
    return BIRTH_DATE_FORMAT_MESSAGE;
  }
}

export function IsProbableAttentionDateDdMmYyyy(
  allowEmpty = false,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [allowEmpty],
      validator: IsProbableAttentionDateDdMmYyyyConstraint,
    });
  };
}
