"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewPreadmissionDto = exports.CreatePreadmissionDto = void 0;
const class_validator_1 = require("class-validator");
const enums_1 = require("../../common/enums");
class CreatePreadmissionDto {
}
exports.CreatePreadmissionDto = CreatePreadmissionDto;
__decorate([
    (0, class_validator_1.IsEnum)(['RAD', 'LAB']),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "departamento", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "name1", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "name2", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "apellido1", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "apellido2", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['C', 'P']),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "pasaporte", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "cedula", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['M', 'F']),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "sexo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "fechanac", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "nacionalidad", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "estadocivil", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "tiposangre", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "celular", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "provincia1", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "distrito1", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "corregimiento1", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "direccion1", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "encasourgencia", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "relacion", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "email3", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "celular3", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "provincia3", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "distrito3", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "corregimiento3", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "direccion3", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "fechaprobableatencion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "medico", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['SI', 'NO']),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "doblecobertura", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.doblecobertura === 'SI'),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "compania1", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.doblecobertura === 'SI'),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "poliza1", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "diagnostico", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "numerocotizacion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "cedulaimagen", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "ordenimagen", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "preautorizacion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "carnetseguro", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePreadmissionDto.prototype, "ssimagen", void 0);
class ReviewPreadmissionDto {
}
exports.ReviewPreadmissionDto = ReviewPreadmissionDto;
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.PreadmissionStatus),
    __metadata("design:type", String)
], ReviewPreadmissionDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReviewPreadmissionDto.prototype, "observaciones", void 0);
//# sourceMappingURL=preadmission.dto.js.map