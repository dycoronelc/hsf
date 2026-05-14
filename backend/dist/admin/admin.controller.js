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
const permissions_guard_1 = require("../permissions/permissions.guard");
const require_permissions_decorator_1 = require("../permissions/require-permissions.decorator");
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
    addRoleToMatrix(dto, req) {
        return this.adminService.addRoleToMatrix(dto, req.user.id);
    }
    patchMatrixRole(role, dto, req) {
        return this.adminService.patchMatrixRole(role, dto, req.user.id);
    }
    removeRoleFromMatrix(role, req) {
        return this.adminService.removeRoleFromMatrix(role, req.user.id);
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
    deleteTicketType(id, req) {
        return this.adminService.deleteTicketType(+id, req.user.id);
    }
    listStaffUsers() {
        return this.adminService.listStaffUsers();
    }
    createStaffUser(dto, req) {
        return this.adminService.createStaffUser(dto, req.user.id);
    }
    updateStaffUser(id, dto, req) {
        return this.adminService.updateStaffUser(+id, dto, req.user.id);
    }
    deleteStaffUser(id, req) {
        return this.adminService.deleteStaffUser(+id, req.user.id);
    }
    async createService(req, name, code, area, estimatedTime) {
        return this.adminService.createTicketType({ name, code, area, estimatedTime }, req.user.id);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('permission-catalog'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_role_permissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPermissionCatalog", null);
__decorate([
    (0, common_1.Get)('role-permissions'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_role_permissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRolePermissions", null);
__decorate([
    (0, common_1.Put)('role-permissions'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_role_permissions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.UpdateRolePermissionsDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateRolePermissions", null);
__decorate([
    (0, common_1.Post)('role-matrix/roles'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_role_permissions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.CreateMatrixRoleDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addRoleToMatrix", null);
__decorate([
    (0, common_1.Patch)('role-matrix/roles/:role'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_role_permissions'),
    __param(0, (0, common_1.Param)('role')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admin_dto_1.PatchMatrixRoleDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "patchMatrixRole", null);
__decorate([
    (0, common_1.Delete)('role-matrix/roles/:role'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_role_permissions'),
    __param(0, (0, common_1.Param)('role')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "removeRoleFromMatrix", null);
__decorate([
    (0, common_1.Get)('ticket-types'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_ticket_types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listTicketTypes", null);
__decorate([
    (0, common_1.Post)('ticket-types'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_ticket_types'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.CreateTicketTypeDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createTicketType", null);
__decorate([
    (0, common_1.Patch)('ticket-types/:id'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_ticket_types'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, admin_dto_1.UpdateTicketTypeDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateTicketType", null);
__decorate([
    (0, common_1.Delete)('ticket-types/:id'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_ticket_types'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteTicketType", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listStaffUsers", null);
__decorate([
    (0, common_1.Post)('users'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_users'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.CreateStaffUserDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createStaffUser", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_users'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, admin_dto_1.UpdateStaffUserDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateStaffUser", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_users'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteStaffUser", null);
__decorate([
    (0, common_1.Post)('services'),
    (0, require_permissions_decorator_1.RequirePermissions)('manage_ticket_types'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('name')),
    __param(2, (0, common_1.Body)('code')),
    __param(3, (0, common_1.Body)('area')),
    __param(4, (0, common_1.Body)('estimatedTime')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createService", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map