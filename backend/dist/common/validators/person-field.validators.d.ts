import { ValidationArguments, ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
export declare class IsPersonNameConstraint implements ValidatorConstraintInterface {
    validate(value: unknown, args: ValidationArguments): boolean;
    defaultMessage(): string;
}
export declare function IsPersonName(allowEmpty?: boolean, validationOptions?: ValidationOptions): (object: object, propertyName: string) => void;
export declare class IsDocumentIdInputConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean;
    defaultMessage(): string;
}
export declare function IsDocumentIdInput(validationOptions?: ValidationOptions): (object: object, propertyName: string) => void;
export declare class IsBirthDateDdMmYyyyConstraint implements ValidatorConstraintInterface {
    validate(value: unknown, args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): string;
}
export declare function IsBirthDateDdMmYyyy(allowEmpty?: boolean, validationOptions?: ValidationOptions): (object: object, propertyName: string) => void;
export declare class IsDdMmYyyyConstraint implements ValidatorConstraintInterface {
    validate(value: unknown, args: ValidationArguments): boolean;
    defaultMessage(): string;
}
export declare function IsDdMmYyyy(allowEmpty?: boolean, validationOptions?: ValidationOptions): (object: object, propertyName: string) => void;
