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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const enums_1 = require("../common/enums");
const admin_dto_1 = require("./dto/admin.dto");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    getPermissionCatalog() {
        return this.adminService.getPermissionCatalog();
    }
    getRolePermissions() {
        return this.adminService.getRolePermissionsMatrix();
    }
    updateRolePermissions(dto, req) {
        return this.adminService.updateRolePermissions(dto, req.user.id);
    }
    listTicketTypes() {
        return this.adminService.listTicketTypes();
    }
    createTicketType(dto, req) {
        return this.adminService.createTicketType(dto, req.user.id);
    }
    updateTicketType(id, dto, req) {
        return this.adminService.updateTicketType(+id, dto, req.user.id);
    }
    listStaffUsers() {
        return this.adminService.listStaffUsers();
    }
    updateStaffUser(id, dto, req) {
        return this.adminService.updateStaffUser(+id, dto, req.user.id);
    }
    async createService(name, code, area, estimatedTime, req) {
        return this.adminService.createTicketType({ name, code, area, estimatedTime }, req?.user?.id ?? 0);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('permission-catalog'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPermissionCatalog", null);
__decorate([
    (0, common_1.Get)('role-permissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRolePermissions", null);
__decorate([
    (0, common_1.Put)('role-permissions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.UpdateRolePermissionsDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateRolePermissions", null);
__decorate([
    (0, common_1.Get)('ticket-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listTicketTypes", null);
__decorate([
    (0, common_1.Post)('ticket-types'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.CreateTicketTypeDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createTicketType", null);
__decorate([
    (0, common_1.Patch)('ticket-types/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, admin_dto_1.UpdateTicketTypeDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateTicketType", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listStaffUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, admin_dto_1.UpdateStaffUserDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateStaffUser", null);
__decorate([
    (0, common_1.Post)('services'),
    __param(0, (0, common_1.Body)('name')),
    __param(1, (0, common_1.Body)('code')),
    __param(2, (0, common_1.Body)('area')),
    __param(3, (0, common_1.Body)('estimatedTime')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createService", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map