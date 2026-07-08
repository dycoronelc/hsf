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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreadmissionController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const preadmission_service_1 = require("./preadmission.service");
const preadmission_dto_1 = require("./dto/preadmission.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../permissions/permissions.guard");
const require_permissions_decorator_1 = require("../permissions/require-permissions.decorator");
const enums_1 = require("../common/enums");
const preadmission_attachments_constants_1 = require("./preadmission-attachments.constants");
const multer_1 = require("multer");
const preadmission_attachments_constants_2 = require("./preadmission-attachments.constants");
const attachmentUpload = (0, platform_express_1.FileFieldsInterceptor)(preadmission_attachments_constants_1.PREADMISSION_ATTACHMENT_FIELDS.map((name) => ({ name, maxCount: 1 })), {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: preadmission_attachments_constants_2.MAX_ATTACHMENT_BYTES },
});
async function parseCreateBody(data) {
    if (!data?.trim()) {
        throw new common_1.BadRequestException('Falta el campo "data" con los datos del formulario (JSON)');
    }
    let parsed;
    try {
        parsed = JSON.parse(data);
    }
    catch {
        throw new common_1.BadRequestException('El campo "data" no es un JSON válido');
    }
    const dto = (0, class_transformer_1.plainToInstance)(preadmission_dto_1.CreatePreadmissionDto, parsed);
    const errors = await (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
        const messages = errors.flatMap((e) => e.constraints ? Object.values(e.constraints) : [`${e.property}: inválido`]);
        throw new common_1.BadRequestException(messages);
    }
    return dto;
}
let PreadmissionController = class PreadmissionController {
    constructor(preadmissionService) {
        this.preadmissionService = preadmissionService;
    }
    async checkActiveDocument(cedula, pasaporte, departamento, fechaprobableatencion) {
        return this.preadmissionService.checkActiveDocument(cedula, pasaporte, departamento, fechaprobableatencion);
    }
    async searchByCedula(cedula, tipoIdentificacion) {
        if (!cedula || !tipoIdentificacion) {
            return null;
        }
        return this.preadmissionService.findByCedula(cedula, tipoIdentificacion);
    }
    async createPublic(data, files) {
        const createDto = await parseCreateBody(data);
        return this.preadmissionService.create(createDto, null, files);
    }
    async parseCedulaQr(body) {
        return this.preadmissionService.parseCedulaQrPayload(body.raw);
    }
    async requestContactVerification(body) {
        return this.preadmissionService.requestContactVerification(body.destination);
    }
    async confirmContactVerification(body) {
        return this.preadmissionService.confirmContactVerification(body.destination, body.code);
    }
    async create(data, files, req) {
        const createDto = await parseCreateBody(data);
        return this.preadmissionService.create(createDto, req.user.id, files);
    }
    async workList(req, arrivalState, q, skip = 0, limit = 100) {
        return this.preadmissionService.findWorkList(req.user, {
            arrivalState,
            q,
            skip,
            limit,
        });
    }
    async findAllForManagement(q, departamento, status, arrivalState, skip = 0, limit = 50) {
        return this.preadmissionService.findAllForManagement({
            q,
            departamento,
            status,
            arrivalState,
            skip,
            limit,
        });
    }
    async findAll(req, skip = 0, limit = 100) {
        return this.preadmissionService.findAll(req.user, skip, limit);
    }
    async getAttachment(id, field, req) {
        const { stream } = await this.preadmissionService.getAttachment(+id, field, req.user);
        return stream;
    }
    async getCellbytePayload(id, req) {
        return this.preadmissionService.getCellbytePayload(+id, req.user);
    }
    async confirmArrival(id, req) {
        return this.preadmissionService.confirmArrival(+id, req.user);
    }
    async activateTicket(id, req) {
        return this.preadmissionService.activateTicket(+id, req.user);
    }
    async findOne(id, req) {
        return this.preadmissionService.findOne(+id, req.user);
    }
    async review(id, reviewDto, req) {
        return this.preadmissionService.review(+id, reviewDto, req.user.id);
    }
};
exports.PreadmissionController = PreadmissionController;
__decorate([
    (0, common_1.Get)('check-active'),
    __param(0, (0, common_1.Query)('cedula')),
    __param(1, (0, common_1.Query)('pasaporte')),
    __param(2, (0, common_1.Query)('departamento')),
    __param(3, (0, common_1.Query)('fechaprobableatencion')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "checkActiveDocument", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('cedula')),
    __param(1, (0, common_1.Query)('tipoIdentificacion')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "searchByCedula", null);
__decorate([
    (0, common_1.Post)('public'),
    (0, common_1.UseInterceptors)(attachmentUpload),
    __param(0, (0, common_1.Body)('data')),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "createPublic", null);
__decorate([
    (0, common_1.Post)('parse-cedula-qr'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [preadmission_dto_1.ParseCedulaQrDto]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "parseCedulaQr", null);
__decorate([
    (0, common_1.Post)('verify-contact/request'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [preadmission_dto_1.RequestVerificationDto]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "requestContactVerification", null);
__decorate([
    (0, common_1.Post)('verify-contact/confirm'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [preadmission_dto_1.ConfirmVerificationDto]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "confirmContactVerification", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)(attachmentUpload),
    __param(0, (0, common_1.Body)('data')),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('work-list'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)('view_host_work_list'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('arrivalState')),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('skip', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(100), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "workList", null);
__decorate([
    (0, common_1.Get)('manage'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)('review_preadmissions'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('departamento')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('arrivalState')),
    __param(4, (0, common_1.Query)('skip', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(5, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "findAllForManagement", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('skip', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(100), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/attachments/:field'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Header)('Cache-Control', 'private, max-age=3600'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('field')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "getAttachment", null);
__decorate([
    (0, common_1.Get)(':id/cellbyte-payload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)('review_preadmissions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "getCellbytePayload", null);
__decorate([
    (0, common_1.Patch)(':id/confirm-arrival'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)('confirm_arrival'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "confirmArrival", null);
__decorate([
    (0, common_1.Post)(':id/activate-ticket'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)('activate_ticket'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "activateTicket", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/review'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)('review_preadmissions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, preadmission_dto_1.ReviewPreadmissionDto, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "review", null);
exports.PreadmissionController = PreadmissionController = __decorate([
    (0, common_1.Controller)('preadmission'),
    __metadata("design:paramtypes", [preadmission_service_1.PreadmissionService])
], PreadmissionController);
//# sourceMappingURL=preadmission.controller.js.map