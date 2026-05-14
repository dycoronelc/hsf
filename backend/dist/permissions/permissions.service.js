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
exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const role_permission_entity_1 = require("../admin/entities/role-permission.entity");
const admin_role_matrix_row_entity_1 = require("../admin/entities/admin-role-matrix-row.entity");
const permission_catalog_1 = require("../admin/permission-catalog");
const enums_1 = require("../common/enums");
let PermissionsService = class PermissionsService {
    constructor(rolePermissionRepository, matrixRowRepository) {
        this.rolePermissionRepository = rolePermissionRepository;
        this.matrixRowRepository = matrixRowRepository;
    }
    isAllowedByDefault(role, permissionKey) {
        const defaults = permission_catalog_1.DEFAULT_ROLE_PERMISSIONS[role] ?? [];
        return defaults.includes(permissionKey);
    }
    async migrateLegacyMatrixIfNeeded() {
        const permCount = await this.rolePermissionRepository.count();
        const matrixCount = await this.matrixRowRepository.count();
        if (permCount > 0 && matrixCount === 0) {
            await this.seedMatrixRows();
        }
    }
    async seedMatrixRows() {
        for (const role of permission_catalog_1.CONFIGURABLE_ROLES) {
            const exists = await this.matrixRowRepository.findOne({ where: { role } });
            if (!exists) {
                await this.matrixRowRepository.save(this.matrixRowRepository.create({ role, isActive: true }));
            }
        }
    }
    async ensureMatrixSeeded() {
        await this.migrateLegacyMatrixIfNeeded();
        const count = await this.matrixRowRepository.count();
        if (count === 0) {
            await this.seedMatrixRows();
        }
    }
    async userHasPermission(role, permissionKey) {
        if (role === enums_1.UserRole.ADMIN) {
            return true;
        }
        if (role === enums_1.UserRole.PATIENT) {
            return false;
        }
        await this.ensureMatrixSeeded();
        const matrixRow = await this.matrixRowRepository.findOne({ where: { role } });
        if (!matrixRow) {
            return false;
        }
        if (!matrixRow.isActive) {
            return false;
        }
        const stored = await this.rolePermissionRepository.findOne({
            where: { role, permissionKey },
        });
        if (stored) {
            return stored.allowed;
        }
        return this.isAllowedByDefault(role, permissionKey);
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(role_permission_entity_1.RolePermission)),
    __param(1, (0, typeorm_1.InjectRepository)(admin_role_matrix_row_entity_1.AdminRoleMatrixRow)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map