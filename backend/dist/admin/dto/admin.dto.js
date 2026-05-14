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
exports.PatchMatrixRoleDto = exports.CreateMatrixRoleDto = exports.CreateStaffUserDto = exports.UpdateStaffUserDto = exports.UpdateTicketTypeDto = exports.CreateTicketTypeDto = exports.UpdateRolePermissionsDto = void 0;
const class_validator_1 = require("class-validator");
const enums_1 = require("../../common/enums");
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[a-z0-9])[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/;
class UpdateRolePermissionsDto {
}
exports.UpdateRolePermissionsDto = UpdateRolePermissionsDto;
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.UserRole),
    __metadata("design:type", String)
], UpdateRolePermissionsDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateRolePermissionsDto.prototype, "permissions", void 0);
class CreateTicketTypeDto {
}
exports.CreateTicketTypeDto = CreateTicketTypeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTicketTypeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTicketTypeDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTicketTypeDto.prototype, "area", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTicketTypeDto.prototype, "ticketPrefix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(3),
    __metadata("design:type", Number)
], CreateTicketTypeDto.prototype, "priorityLevel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateTicketTypeDto.prototype, "estimatedTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTicketTypeDto.prototype, "isActive", void 0);
class UpdateTicketTypeDto {
}
exports.UpdateTicketTypeDto = UpdateTicketTypeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTicketTypeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTicketTypeDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTicketTypeDto.prototype, "area", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTicketTypeDto.prototype, "ticketPrefix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(3),
    __metadata("design:type", Number)
], UpdateTicketTypeDto.prototype, "priorityLevel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateTicketTypeDto.prototype, "estimatedTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTicketTypeDto.prototype, "isActive", void 0);
class UpdateStaffUserDto {
}
exports.UpdateStaffUserDto = UpdateStaffUserDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enums_1.UserRole),
    __metadata("design:type", String)
], UpdateStaffUserDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateStaffUserDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStaffUserDto.prototype, "fullName", void 0);
class CreateStaffUserDto {
}
exports.CreateStaffUserDto = CreateStaffUserDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateStaffUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.Matches)(PASSWORD_RULE, {
        message: 'La contraseña debe ser alfanumérica e incluir al menos una mayúscula',
    }),
    __metadata("design:type", String)
], CreateStaffUserDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStaffUserDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.UserRole),
    __metadata("design:type", String)
], CreateStaffUserDto.prototype, "role", void 0);
class CreateMatrixRoleDto {
}
exports.CreateMatrixRoleDto = CreateMatrixRoleDto;
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.UserRole),
    __metadata("design:type", String)
], CreateMatrixRoleDto.prototype, "role", void 0);
class PatchMatrixRoleDto {
}
exports.PatchMatrixRoleDto = PatchMatrixRoleDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PatchMatrixRoleDto.prototype, "isActive", void 0);
//# sourceMappingURL=admin.dto.js.map