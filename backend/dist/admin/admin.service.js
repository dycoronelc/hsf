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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const service_entity_1 = require("../services/entities/service.entity");
const role_permission_entity_1 = require("./entities/role-permission.entity");
const user_entity_1 = require("../users/entities/user.entity");
const permission_catalog_1 = require("./permission-catalog");
const enums_1 = require("../common/enums");
const audit_service_1 = require("../audit/audit.service");
let AdminService = class AdminService {
    constructor(serviceRepository, rolePermissionRepository, userRepository, auditService) {
        this.serviceRepository = serviceRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }
    getPermissionCatalog() {
        return {
            permissions: permission_catalog_1.ADMIN_PERMISSION_CATALOG,
            roles: permission_catalog_1.CONFIGURABLE_ROLES,
        };
    }
    isAllowedByDefault(role, permissionKey) {
        const defaults = permission_catalog_1.DEFAULT_ROLE_PERMISSIONS[role] ?? [];
        return defaults.includes(permissionKey);
    }
    async ensureDefaultPermissions() {
        const existing = await this.rolePermissionRepository.count();
        if (existing > 0)
            return;
        const rows = [];
        for (const role of permission_catalog_1.CONFIGURABLE_ROLES) {
            for (const permission of permission_catalog_1.ADMIN_PERMISSION_CATALOG) {
                rows.push(this.rolePermissionRepository.create({
                    role,
                    permissionKey: permission.key,
                    allowed: this.isAllowedByDefault(role, permission.key),
                }));
            }
        }
        await this.rolePermissionRepository.save(rows);
    }
    async getRolePermissionsMatrix() {
        await this.ensureDefaultPermissions();
        const stored = await this.rolePermissionRepository.find();
        const matrix = {};
        for (const role of permission_catalog_1.CONFIGURABLE_ROLES) {
            matrix[role] = {};
            for (const permission of permission_catalog_1.ADMIN_PERMISSION_CATALOG) {
                const row = stored.find((r) => r.role === role && r.permissionKey === permission.key);
                matrix[role][permission.key] =
                    row?.allowed ?? this.isAllowedByDefault(role, permission.key);
            }
        }
        return {
            permissions: permission_catalog_1.ADMIN_PERMISSION_CATALOG,
            roles: permission_catalog_1.CONFIGURABLE_ROLES,
            matrix,
        };
    }
    async updateRolePermissions(dto, adminUserId) {
        if (dto.role === enums_1.UserRole.ADMIN || dto.role === enums_1.UserRole.PATIENT) {
            throw new common_1.BadRequestException('Este rol no se configura desde la matriz de permisos');
        }
        if (!permission_catalog_1.CONFIGURABLE_ROLES.includes(dto.role)) {
            throw new common_1.BadRequestException('Rol no configurable');
        }
        await this.ensureDefaultPermissions();
        for (const permission of permission_catalog_1.ADMIN_PERMISSION_CATALOG) {
            const allowed = !!dto.permissions[permission.key];
            const existing = await this.rolePermissionRepository.findOne({
                where: { role: dto.role, permissionKey: permission.key },
            });
            if (existing) {
                existing.allowed = allowed;
                await this.rolePermissionRepository.save(existing);
            }
            else {
                await this.rolePermissionRepository.save(this.rolePermissionRepository.create({
                    role: dto.role,
                    permissionKey: permission.key,
                    allowed,
                }));
            }
        }
        await this.auditService.log('role_permissions_updated', {
            entityType: 'role',
            userId: adminUserId,
            details: dto.role,
        });
        return this.getRolePermissionsMatrix();
    }
    async listTicketTypes() {
        return this.serviceRepository.find({
            order: { area: 'ASC', name: 'ASC' },
        });
    }
    async createTicketType(dto, adminUserId) {
        const existing = await this.serviceRepository.findOne({ where: { code: dto.code } });
        if (existing) {
            throw new common_1.BadRequestException('Ya existe un tipo de ticket con ese código');
        }
        const service = this.serviceRepository.create({
            name: dto.name,
            code: dto.code.toUpperCase(),
            area: dto.area.toUpperCase(),
            ticketPrefix: dto.ticketPrefix?.toUpperCase() || dto.code.toUpperCase(),
            priorityLevel: dto.priorityLevel ?? 2,
            estimatedTime: dto.estimatedTime ?? 15,
            isActive: dto.isActive ?? true,
        });
        const saved = await this.serviceRepository.save(service);
        await this.auditService.log('ticket_type_created', {
            entityType: 'service',
            entityId: saved.id,
            userId: adminUserId,
        });
        return saved;
    }
    async updateTicketType(id, dto, adminUserId) {
        const service = await this.serviceRepository.findOne({ where: { id } });
        if (!service) {
            throw new common_1.NotFoundException('Tipo de ticket no encontrado');
        }
        if (dto.code && dto.code.toUpperCase() !== service.code) {
            const duplicate = await this.serviceRepository.findOne({ where: { code: dto.code.toUpperCase() } });
            if (duplicate) {
                throw new common_1.BadRequestException('Ya existe un tipo de ticket con ese código');
            }
            service.code = dto.code.toUpperCase();
        }
        if (dto.name !== undefined)
            service.name = dto.name;
        if (dto.area !== undefined)
            service.area = dto.area.toUpperCase();
        if (dto.ticketPrefix !== undefined)
            service.ticketPrefix = dto.ticketPrefix.toUpperCase();
        if (dto.priorityLevel !== undefined)
            service.priorityLevel = dto.priorityLevel;
        if (dto.estimatedTime !== undefined)
            service.estimatedTime = dto.estimatedTime;
        if (dto.isActive !== undefined)
            service.isActive = dto.isActive;
        const saved = await this.serviceRepository.save(service);
        await this.auditService.log('ticket_type_updated', {
            entityType: 'service',
            entityId: saved.id,
            userId: adminUserId,
        });
        return saved;
    }
    async listStaffUsers() {
        return this.userRepository.find({
            where: { role: (0, typeorm_2.Not)(enums_1.UserRole.PATIENT) },
            order: { fullName: 'ASC', email: 'ASC' },
            select: ['id', 'email', 'fullName', 'role', 'isActive', 'createdAt'],
        });
    }
    async updateStaffUser(id, dto, adminUserId) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (user.role === enums_1.UserRole.ADMIN && dto.role && dto.role !== enums_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('No puede degradar al administrador principal desde esta pantalla');
        }
        if (dto.role !== undefined)
            user.role = dto.role;
        if (dto.isActive !== undefined)
            user.isActive = dto.isActive;
        const saved = await this.userRepository.save(user);
        await this.auditService.log('staff_user_updated', {
            entityType: 'user',
            entityId: saved.id,
            userId: adminUserId,
            details: `role=${saved.role};active=${saved.isActive}`,
        });
        return {
            id: saved.id,
            email: saved.email,
            fullName: saved.fullName,
            role: saved.role,
            isActive: saved.isActive,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(1, (0, typeorm_1.InjectRepository)(role_permission_entity_1.RolePermission)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService])
], AdminService);
//# sourceMappingURL=admin.service.js.map