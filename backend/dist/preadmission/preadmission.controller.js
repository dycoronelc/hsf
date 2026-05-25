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
const preadmission_service_1 = require("./preadmission.service");
const preadmission_dto_1 = require("./dto/preadmission.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../permissions/permissions.guard");
const require_permissions_decorator_1 = require("../permissions/require-permissions.decorator");
const enums_1 = require("../common/enums");
let PreadmissionController = class PreadmissionController {
    constructor(preadmissionService) {
        this.preadmissionService = preadmissionService;
    }
    async searchByCedula(cedula, tipoIdentificacion) {
        if (!cedula || !tipoIdentificacion) {
            return null;
        }
        return this.preadmissionService.findByCedula(cedula, tipoIdentificacion);
    }
    async createPublic(createDto) {
        return this.preadmissionService.create(createDto, null);
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
    async create(createDto, req) {
        return this.preadmissionService.create(createDto, req.user.id);
    }
    async workList(req, arrivalState, q, skip, limit) {
        return this.preadmissionService.findWorkList(req.user, {
            arrivalState,
            q,
            skip: skip ?? 0,
            limit: limit ?? 100,
        });
    }
    async findAll(req, skip, limit) {
        return this.preadmissionService.findAll(req.user, skip || 0, limit || 100);
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
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('cedula')),
    __param(1, (0, common_1.Query)('tipoIdentificacion')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "searchByCedula", null);
__decorate([
    (0, common_1.Post)('public'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [preadmission_dto_1.CreatePreadmissionDto]),
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
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [preadmission_dto_1.CreatePreadmissionDto, Object]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('work-list'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)('view_host_work_list'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('arrivalState')),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('skip')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "workList", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], PreadmissionController.prototype, "findAll", null);
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