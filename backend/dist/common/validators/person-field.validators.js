"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsProbableAttentionDateDdMmYyyyConstraint = exports.IsDdMmYyyyConstraint = exports.IsBirthDateDdMmYyyyConstraint = exports.IsDocumentIdInputConstraint = exports.IsPersonNameConstraint = void 0;
exports.IsPersonName = IsPersonName;
exports.IsDocumentIdInput = IsDocumentIdInput;
exports.IsBirthDateDdMmYyyy = IsBirthDateDdMmYyyy;
exports.IsDdMmYyyy = IsDdMmYyyy;
exports.IsProbableAttentionDateDdMmYyyy = IsProbableAttentionDateDdMmYyyy;
const class_validator_1 = require("class-validator");
const person_fields_1 = require("../validation/person-fields");
let IsPersonNameConstraint = class IsPersonNameConstraint {
    validate(value, args) {
        if (value === undefined || value === null || value === '') {
            return args.constraints[0] === true;
        }
        if (typeof value !== 'string')
            return false;
        return (0, person_fields_1.isValidPersonName)(value, { allowEmpty: args.constraints[0] === true });
    }
    defaultMessage() {
        return 'Solo letras, espacios, apóstrofes y guiones';
    }
};
exports.IsPersonNameConstraint = IsPersonNameConstraint;
exports.IsPersonNameConstraint = IsPersonNameConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isPersonName', async: false })
], IsPersonNameConstraint);
function IsPersonName(allowEmpty = false, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [allowEmpty],
            validator: IsPersonNameConstraint,
        });
    };
}
let IsDocumentIdInputConstraint = class IsDocumentIdInputConstraint {
    validate(value) {
        if (value === undefined || value === null || value === '')
            return true;
        if (typeof value !== 'string')
            return false;
        return (0, person_fields_1.isValidDocumentIdInput)(value);
    }
    defaultMessage() {
        return 'Documento: solo letras, números y guiones';
    }
};
exports.IsDocumentIdInputConstraint = IsDocumentIdInputConstraint;
exports.IsDocumentIdInputConstraint = IsDocumentIdInputConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isDocumentIdInput', async: false })
], IsDocumentIdInputConstraint);
function IsDocumentIdInput(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: IsDocumentIdInputConstraint,
        });
    };
}
let IsBirthDateDdMmYyyyConstraint = class IsBirthDateDdMmYyyyConstraint {
    validate(value, args) {
        if (value === undefined || value === null || value === '') {
            return args.constraints[0] === true;
        }
        if (typeof value !== 'string')
            return false;
        return (0, person_fields_1.isValidBirthDateDdMmYyyy)(value);
    }
    defaultMessage(args) {
        if (typeof args.value !== 'string' || !args.value.trim()) {
            return person_fields_1.BIRTH_DATE_FORMAT_MESSAGE;
        }
        const result = (0, person_fields_1.validateBirthDateDdMmYyyy)(args.value);
        if (!result.valid)
            return result.message;
        return person_fields_1.BIRTH_DATE_FORMAT_MESSAGE;
    }
};
exports.IsBirthDateDdMmYyyyConstraint = IsBirthDateDdMmYyyyConstraint;
exports.IsBirthDateDdMmYyyyConstraint = IsBirthDateDdMmYyyyConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isBirthDateDdMmYyyy', async: false })
], IsBirthDateDdMmYyyyConstraint);
function IsBirthDateDdMmYyyy(allowEmpty = false, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [allowEmpty],
            validator: IsBirthDateDdMmYyyyConstraint,
        });
    };
}
let IsDdMmYyyyConstraint = class IsDdMmYyyyConstraint {
    validate(value, args) {
        if (value === undefined || value === null || value === '') {
            return args.constraints[0] === true;
        }
        if (typeof value !== 'string')
            return false;
        return (0, person_fields_1.isValidDdMmYyyy)(value);
    }
    defaultMessage() {
        return person_fields_1.BIRTH_DATE_FORMAT_MESSAGE;
    }
};
exports.IsDdMmYyyyConstraint = IsDdMmYyyyConstraint;
exports.IsDdMmYyyyConstraint = IsDdMmYyyyConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isDdMmYyyy', async: false })
], IsDdMmYyyyConstraint);
function IsDdMmYyyy(allowEmpty = false, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [allowEmpty],
            validator: IsDdMmYyyyConstraint,
        });
    };
}
let IsProbableAttentionDateDdMmYyyyConstraint = class IsProbableAttentionDateDdMmYyyyConstraint {
    validate(value, args) {
        if (value === undefined || value === null || value === '') {
            return args.constraints[0] === true;
        }
        if (typeof value !== 'string')
            return false;
        return (0, person_fields_1.isValidProbableAttentionDateDdMmYyyy)(value);
    }
    defaultMessage(args) {
        if (typeof args.value !== 'string' || !args.value.trim()) {
            return person_fields_1.BIRTH_DATE_FORMAT_MESSAGE;
        }
        const result = (0, person_fields_1.validateProbableAttentionDateDdMmYyyy)(args.value);
        if (!result.valid)
            return result.message;
        return person_fields_1.BIRTH_DATE_FORMAT_MESSAGE;
    }
};
exports.IsProbableAttentionDateDdMmYyyyConstraint = IsProbableAttentionDateDdMmYyyyConstraint;
exports.IsProbableAttentionDateDdMmYyyyConstraint = IsProbableAttentionDateDdMmYyyyConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isProbableAttentionDateDdMmYyyy', async: false })
], IsProbableAttentionDateDdMmYyyyConstraint);
function IsProbableAttentionDateDdMmYyyy(allowEmpty = false, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [allowEmpty],
            validator: IsProbableAttentionDateDdMmYyyyConstraint,
        });
    };
}
//# sourceMappingURL=person-field.validators.js.map