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
const bcrypt = require("bcrypt");
const service_entity_1 = require("../services/entities/service.entity");
const role_permission_entity_1 = require("./entities/role-permission.entity");
const admin_role_matrix_row_entity_1 = require("./entities/admin-role-matrix-row.entity");
const user_entity_1 = require("../users/entities/user.entity");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
const notification_entity_1 = require("../notifications/entities/notification.entity");
const password_reset_token_entity_1 = require("../auth/entities/password-reset-token.entity");
const permission_catalog_1 = require("./permission-catalog");
const enums_1 = require("../common/enums");
const audit_service_1 = require("../audit/audit.service");
let AdminService = class AdminService {
    constructor(serviceRepository, rolePermissionRepository, matrixRowRepository, userRepository, ticketRepository, notificationRepository, passwordResetTokenRepository, auditService) {
        this.serviceRepository = serviceRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.matrixRowRepository = matrixRowRepository;
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
        this.notificationRepository = notificationRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
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
    async ensureAdminRoleMatrixRows() {
        let rows = await this.matrixRowRepository.find({ order: { role: 'ASC' } });
        if (rows.length === 0) {
            for (const role of permission_catalog_1.CONFIGURABLE_ROLES) {
                await this.matrixRowRepository.save(this.matrixRowRepository.create({ role, isActive: true }));
            }
            rows = await this.matrixRowRepository.find({ order: { role: 'ASC' } });
        }
        return rows;
    }
    async ensureRolePermissionCells() {
        const matrixRows = await this.matrixRowRepository.find();
        for (const { role } of matrixRows) {
            for (const permission of permission_catalog_1.ADMIN_PERMISSION_CATALOG) {
                const existing = await this.rolePermissionRepository.findOne({
                    where: { role, permissionKey: permission.key },
                });
                if (!existing) {
                    await this.rolePermissionRepository.save(this.rolePermissionRepository.create({
                        role,
                        permissionKey: permission.key,
                        allowed: this.isAllowedByDefault(role, permission.key),
                    }));
                }
            }
        }
    }
    async migrateLegacyPermissionsIfNeeded() {
        const permCount = await this.rolePermissionRepository.count();
        const matrixCount = await this.matrixRowRepository.count();
        if (permCount > 0 && matrixCount === 0) {
            await this.ensureAdminRoleMatrixRows();
        }
    }
    async getRolePermissionsMatrix() {
        await this.migrateLegacyPermissionsIfNeeded();
        await this.ensureAdminRoleMatrixRows();
        await this.ensureRolePermissionCells();
        const matrixRows = await this.matrixRowRepository.find({ order: { role: 'ASC' } });
        const stored = await this.rolePermissionRepository.find();
        const matrix = {};
        for (const { role } of matrixRows) {
            matrix[role] = {};
            for (const permission of permission_catalog_1.ADMIN_PERMISSION_CATALOG) {
                const row = stored.find((r) => r.role === role && r.permissionKey === permission.key);
                matrix[role][permission.key] =
                    row?.allowed ?? this.isAllowedByDefault(role, permission.key);
            }
        }
        const roleSummaries = matrixRows.map((mr) => {
            const perms = matrix[mr.role] ?? {};
            const enabledCount = Object.values(perms).filter(Boolean).length;
            return {
                role: mr.role,
                isActive: mr.isActive,
                enabledCount,
                totalCount: permission_catalog_1.ADMIN_PERMISSION_CATALOG.length,
            };
        });
        const activeRoles = matrixRows.filter((r) => r.isActive).map((r) => r.role);
        const addableRoles = permission_catalog_1.CONFIGURABLE_ROLES.filter((role) => !matrixRows.some((row) => row.role === role && row.isActive));
        return {
            permissions: permission_catalog_1.ADMIN_PERMISSION_CATALOG,
            roles: activeRoles,
            roleSummaries,
            addableRoles,
            matrix,
        };
    }
    async updateRolePermissions(dto, adminUserId) {
        if (dto.role === enums_1.UserRole.ADMIN || dto.role === enums_1.UserRole.PATIENT) {
            throw new common_1.BadRequestException('Este rol no se configura desde la matriz de permisos');
        }
        const matrixRow = await this.matrixRowRepository.findOne({ where: { role: dto.role } });
        if (!matrixRow) {
            throw new common_1.BadRequestException('Rol no registrado en la matriz');
        }
        await this.ensureRolePermissionCells();
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
    async addRoleToMatrix(dto, adminUserId) {
        if (dto.role === enums_1.UserRole.ADMIN || dto.role === enums_1.UserRole.PATIENT) {
            throw new common_1.BadRequestException('Este rol no se administra en la matriz');
        }
        if (!permission_catalog_1.CONFIGURABLE_ROLES.includes(dto.role)) {
            throw new common_1.BadRequestException('Rol no válido para la matriz');
        }
        let row = await this.matrixRowRepository.findOne({ where: { role: dto.role } });
        if (row?.isActive) {
            throw new common_1.ConflictException('El rol ya está activo en la matriz');
        }
        if (row) {
            row.isActive = true;
            await this.matrixRowRepository.save(row);
        }
        else {
            row = await this.matrixRowRepository.save(this.matrixRowRepository.create({ role: dto.role, isActive: true }));
        }
        for (const permission of permission_catalog_1.ADMIN_PERMISSION_CATALOG) {
            const existing = await this.rolePermissionRepository.findOne({
                where: { role: dto.role, permissionKey: permission.key },
            });
            if (!existing) {
                await this.rolePermissionRepository.save(this.rolePermissionRepository.create({
                    role: dto.role,
                    permissionKey: permission.key,
                    allowed: this.isAllowedByDefault(dto.role, permission.key),
                }));
            }
        }
        await this.auditService.log('role_matrix_role_added', {
            entityType: 'role',
            userId: adminUserId,
            details: dto.role,
        });
        return this.getRolePermissionsMatrix();
    }
    async patchMatrixRole(roleParam, dto, adminUserId) {
        const role = roleParam;
        const row = await this.matrixRowRepository.findOne({ where: { role } });
        if (!row) {
            throw new common_1.NotFoundException('Rol no encontrado en la matriz');
        }
        row.isActive = dto.isActive;
        await this.matrixRowRepository.save(row);
        await this.auditService.log('role_matrix_role_patched', {
            entityType: 'role',
            userId: adminUserId,
            details: `${role};active=${dto.isActive}`,
        });
        return this.getRolePermissionsMatrix();
    }
    async removeRoleFromMatrix(roleParam, adminUserId) {
        const role = roleParam;
        if (role === enums_1.UserRole.ADMIN || role === enums_1.UserRole.PATIENT) {
            throw new common_1.BadRequestException('Este rol no se elimina de la matriz');
        }
        const row = await this.matrixRowRepository.findOne({ where: { role } });
        if (!row) {
            throw new common_1.NotFoundException('Rol no encontrado en la matriz');
        }
        await this.rolePermissionRepository.delete({ role });
        await this.matrixRowRepository.delete({ role });
        await this.auditService.log('role_matrix_role_removed', {
            entityType: 'role',
            userId: adminUserId,
            details: role,
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
    async deleteTicketType(id, adminUserId) {
        const service = await this.serviceRepository.findOne({ where: { id } });
        if (!service) {
            throw new common_1.NotFoundException('Tipo de ticket no encontrado');
        }
        const ticketCount = await this.ticketRepository.count({ where: { serviceId: id } });
        if (ticketCount > 0) {
            throw new common_1.BadRequestException(`No se puede eliminar: hay ${ticketCount} ticket(s) asociados a este tipo. Desactívelo en su lugar.`);
        }
        await this.serviceRepository.delete({ id });
        await this.auditService.log('ticket_type_deleted', {
            entityType: 'service',
            entityId: id,
            userId: adminUserId,
        });
        return { ok: true };
    }
    async listStaffUsers() {
        return this.userRepository.find({
            where: { role: (0, typeorm_2.Not)(enums_1.UserRole.PATIENT) },
            order: { fullName: 'ASC', email: 'ASC' },
            select: ['id', 'email', 'fullName', 'role', 'isActive', 'createdAt'],
        });
    }
    async assertRoleAssignable(role) {
        if (role === enums_1.UserRole.PATIENT) {
            throw new common_1.BadRequestException('Los pacientes no se gestionan desde esta pantalla');
        }
        if (role === enums_1.UserRole.ADMIN) {
            return;
        }
        await this.migrateLegacyPermissionsIfNeeded();
        await this.ensureAdminRoleMatrixRows();
        const row = await this.matrixRowRepository.findOne({ where: { role, isActive: true } });
        if (!row) {
            throw new common_1.BadRequestException('El rol está desactivado en la matriz de permisos o no está disponible');
        }
    }
    async createStaffUser(dto, adminUserId) {
        await this.assertRoleAssignable(dto.role);
        const existingEmail = await this.userRepository.findOne({ where: { email: dto.email } });
        if (existingEmail) {
            throw new common_1.ConflictException('Ya existe una cuenta con este correo electrónico');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = this.userRepository.create({
            email: dto.email,
            hashedPassword,
            fullName: dto.fullName ?? null,
            role: dto.role,
            isActive: true,
        });
        const saved = await this.userRepository.save(user);
        await this.auditService.log('staff_user_created', {
            entityType: 'user',
            entityId: saved.id,
            userId: adminUserId,
            details: saved.role,
        });
        return {
            id: saved.id,
            email: saved.email,
            fullName: saved.fullName,
            role: saved.role,
            isActive: saved.isActive,
        };
    }
    async updateStaffUser(id, dto, adminUserId) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (user.role === enums_1.UserRole.PATIENT) {
            throw new common_1.BadRequestException('No puede editar pacientes desde esta pantalla');
        }
        if (dto.role !== undefined) {
            await this.assertRoleAssignable(dto.role);
        }
        if (user.role === enums_1.UserRole.ADMIN && dto.role && dto.role !== enums_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('No puede degradar al administrador principal desde esta pantalla');
        }
        if (dto.role !== undefined)
            user.role = dto.role;
        if (dto.isActive !== undefined)
            user.isActive = dto.isActive;
        if (dto.fullName !== undefined)
            user.fullName = dto.fullName || null;
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
    async deleteStaffUser(id, adminUserId) {
        if (id === adminUserId) {
            throw new common_1.BadRequestException('No puede eliminar su propia cuenta');
        }
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (user.role === enums_1.UserRole.PATIENT) {
            throw new common_1.BadRequestException('No puede eliminar pacientes desde esta pantalla');
        }
        if (user.role === enums_1.UserRole.ADMIN) {
            const otherAdmins = await this.userRepository.count({
                where: { role: enums_1.UserRole.ADMIN, isActive: true, id: (0, typeorm_2.Not)(id) },
            });
            if (otherAdmins === 0) {
                throw new common_1.BadRequestException('No puede eliminar al único administrador activo');
            }
        }
        const ticketRefs = await this.ticketRepository.count({ where: { calledBy: id } });
        if (ticketRefs > 0) {
            throw new common_1.BadRequestException('No se puede eliminar: el usuario figura como responsable de llamados en tickets históricos. Desactívelo.');
        }
        await this.notificationRepository.delete({ recipientId: id });
        await this.passwordResetTokenRepository.delete({ userId: id });
        await this.userRepository.delete({ id });
        await this.auditService.log('staff_user_deleted', {
            entityType: 'user',
            entityId: id,
            userId: adminUserId,
        });
        return { ok: true };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(1, (0, typeorm_1.InjectRepository)(role_permission_entity_1.RolePermission)),
    __param(2, (0, typeorm_1.InjectRepository)(admin_role_matrix_row_entity_1.AdminRoleMatrixRow)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, typeorm_1.InjectRepository)(ticket_entity_1.Ticket)),
    __param(5, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(6, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService])
], AdminService);
//# sourceMappingURL=admin.service.js.map