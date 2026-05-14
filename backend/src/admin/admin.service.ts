import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Service } from '../services/entities/service.entity';
import { RolePermission } from './entities/role-permission.entity';
import { AdminRoleMatrixRow } from './entities/admin-role-matrix-row.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import {
  ADMIN_PERMISSION_CATALOG,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  AdminPermissionKey,
} from './permission-catalog';
import { UserRole } from '../common/enums';
import {
  CreateMatrixRoleDto,
  CreateStaffUserDto,
  CreateTicketTypeDto,
  PatchMatrixRoleDto,
  UpdateRolePermissionsDto,
  UpdateStaffUserDto,
  UpdateTicketTypeDto,
} from './dto/admin.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(AdminRoleMatrixRow)
    private matrixRowRepository: Repository<AdminRoleMatrixRow>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private auditService: AuditService,
  ) {}

  getPermissionCatalog() {
    return {
      permissions: ADMIN_PERMISSION_CATALOG,
      roles: CONFIGURABLE_ROLES,
    };
  }

  private isAllowedByDefault(role: UserRole, permissionKey: AdminPermissionKey): boolean {
    const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    return defaults.includes(permissionKey);
  }

  private async ensureAdminRoleMatrixRows(): Promise<AdminRoleMatrixRow[]> {
    let rows = await this.matrixRowRepository.find({ order: { role: 'ASC' } });
    if (rows.length === 0) {
      for (const role of CONFIGURABLE_ROLES) {
        await this.matrixRowRepository.save(
          this.matrixRowRepository.create({ role, isActive: true }),
        );
      }
      rows = await this.matrixRowRepository.find({ order: { role: 'ASC' } });
    }
    return rows;
  }

  /** Asegura una fila role_permission por (rol, permiso) para cada rol en la matriz. */
  private async ensureRolePermissionCells(): Promise<void> {
    const matrixRows = await this.matrixRowRepository.find();
    for (const { role } of matrixRows) {
      for (const permission of ADMIN_PERMISSION_CATALOG) {
        const existing = await this.rolePermissionRepository.findOne({
          where: { role, permissionKey: permission.key },
        });
        if (!existing) {
          await this.rolePermissionRepository.save(
            this.rolePermissionRepository.create({
              role,
              permissionKey: permission.key,
              allowed: this.isAllowedByDefault(role as UserRole, permission.key),
            }),
          );
        }
      }
    }
  }

  /** Compatibilidad: si existían permisos sin tabla de matriz, poblar matriz y celdas faltantes. */
  private async migrateLegacyPermissionsIfNeeded(): Promise<void> {
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
    const matrix: Record<string, Record<string, boolean>> = {};

    for (const { role } of matrixRows) {
      matrix[role] = {};
      for (const permission of ADMIN_PERMISSION_CATALOG) {
        const row = stored.find((r) => r.role === role && r.permissionKey === permission.key);
        matrix[role][permission.key] =
          row?.allowed ?? this.isAllowedByDefault(role as UserRole, permission.key);
      }
    }

    const roleSummaries = matrixRows.map((mr) => {
      const perms = matrix[mr.role] ?? {};
      const enabledCount = Object.values(perms).filter(Boolean).length;
      return {
        role: mr.role,
        isActive: mr.isActive,
        enabledCount,
        totalCount: ADMIN_PERMISSION_CATALOG.length,
      };
    });

    const activeRoles = matrixRows.filter((r) => r.isActive).map((r) => r.role);
    const addableRoles = CONFIGURABLE_ROLES.filter(
      (role) => !matrixRows.some((row) => row.role === role && row.isActive),
    );

    return {
      permissions: ADMIN_PERMISSION_CATALOG,
      roles: activeRoles,
      roleSummaries,
      addableRoles,
      matrix,
    };
  }

  async updateRolePermissions(dto: UpdateRolePermissionsDto, adminUserId: number) {
    if (dto.role === UserRole.ADMIN || dto.role === UserRole.PATIENT) {
      throw new BadRequestException('Este rol no se configura desde la matriz de permisos');
    }
    const matrixRow = await this.matrixRowRepository.findOne({ where: { role: dto.role } });
    if (!matrixRow) {
      throw new BadRequestException('Rol no registrado en la matriz');
    }

    await this.ensureRolePermissionCells();

    for (const permission of ADMIN_PERMISSION_CATALOG) {
      const allowed = !!dto.permissions[permission.key];
      const existing = await this.rolePermissionRepository.findOne({
        where: { role: dto.role, permissionKey: permission.key },
      });
      if (existing) {
        existing.allowed = allowed;
        await this.rolePermissionRepository.save(existing);
      } else {
        await this.rolePermissionRepository.save(
          this.rolePermissionRepository.create({
            role: dto.role,
            permissionKey: permission.key,
            allowed,
          }),
        );
      }
    }

    await this.auditService.log('role_permissions_updated', {
      entityType: 'role',
      userId: adminUserId,
      details: dto.role,
    });

    return this.getRolePermissionsMatrix();
  }

  async addRoleToMatrix(dto: CreateMatrixRoleDto, adminUserId: number) {
    if (dto.role === UserRole.ADMIN || dto.role === UserRole.PATIENT) {
      throw new BadRequestException('Este rol no se administra en la matriz');
    }
    if (!CONFIGURABLE_ROLES.includes(dto.role)) {
      throw new BadRequestException('Rol no válido para la matriz');
    }

    let row = await this.matrixRowRepository.findOne({ where: { role: dto.role } });
    if (row?.isActive) {
      throw new ConflictException('El rol ya está activo en la matriz');
    }
    if (row) {
      row.isActive = true;
      await this.matrixRowRepository.save(row);
    } else {
      row = await this.matrixRowRepository.save(
        this.matrixRowRepository.create({ role: dto.role, isActive: true }),
      );
    }

    for (const permission of ADMIN_PERMISSION_CATALOG) {
      const existing = await this.rolePermissionRepository.findOne({
        where: { role: dto.role, permissionKey: permission.key },
      });
      if (!existing) {
        await this.rolePermissionRepository.save(
          this.rolePermissionRepository.create({
            role: dto.role,
            permissionKey: permission.key,
            allowed: this.isAllowedByDefault(dto.role, permission.key),
          }),
        );
      }
    }

    await this.auditService.log('role_matrix_role_added', {
      entityType: 'role',
      userId: adminUserId,
      details: dto.role,
    });

    return this.getRolePermissionsMatrix();
  }

  async patchMatrixRole(roleParam: string, dto: PatchMatrixRoleDto, adminUserId: number) {
    const role = roleParam as UserRole;
    const row = await this.matrixRowRepository.findOne({ where: { role } });
    if (!row) {
      throw new NotFoundException('Rol no encontrado en la matriz');
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

  async removeRoleFromMatrix(roleParam: string, adminUserId: number) {
    const role = roleParam as UserRole;
    if (role === UserRole.ADMIN || role === UserRole.PATIENT) {
      throw new BadRequestException('Este rol no se elimina de la matriz');
    }
    const row = await this.matrixRowRepository.findOne({ where: { role } });
    if (!row) {
      throw new NotFoundException('Rol no encontrado en la matriz');
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

  async createTicketType(dto: CreateTicketTypeDto, adminUserId: number) {
    const existing = await this.serviceRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException('Ya existe un tipo de ticket con ese código');
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

  async updateTicketType(id: number, dto: UpdateTicketTypeDto, adminUserId: number) {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Tipo de ticket no encontrado');
    }

    if (dto.code && dto.code.toUpperCase() !== service.code) {
      const duplicate = await this.serviceRepository.findOne({ where: { code: dto.code.toUpperCase() } });
      if (duplicate) {
        throw new BadRequestException('Ya existe un tipo de ticket con ese código');
      }
      service.code = dto.code.toUpperCase();
    }

    if (dto.name !== undefined) service.name = dto.name;
    if (dto.area !== undefined) service.area = dto.area.toUpperCase();
    if (dto.ticketPrefix !== undefined) service.ticketPrefix = dto.ticketPrefix.toUpperCase();
    if (dto.priorityLevel !== undefined) service.priorityLevel = dto.priorityLevel;
    if (dto.estimatedTime !== undefined) service.estimatedTime = dto.estimatedTime;
    if (dto.isActive !== undefined) service.isActive = dto.isActive;

    const saved = await this.serviceRepository.save(service);
    await this.auditService.log('ticket_type_updated', {
      entityType: 'service',
      entityId: saved.id,
      userId: adminUserId,
    });
    return saved;
  }

  async deleteTicketType(id: number, adminUserId: number) {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Tipo de ticket no encontrado');
    }
    const ticketCount = await this.ticketRepository.count({ where: { serviceId: id } });
    if (ticketCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: hay ${ticketCount} ticket(s) asociados a este tipo. Desactívelo en su lugar.`,
      );
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
      where: { role: Not(UserRole.PATIENT) },
      order: { fullName: 'ASC', email: 'ASC' },
      select: ['id', 'email', 'fullName', 'role', 'isActive', 'createdAt'],
    });
  }

  private async assertRoleAssignable(role: UserRole): Promise<void> {
    if (role === UserRole.PATIENT) {
      throw new BadRequestException('Los pacientes no se gestionan desde esta pantalla');
    }
    if (role === UserRole.ADMIN) {
      return;
    }
    await this.migrateLegacyPermissionsIfNeeded();
    await this.ensureAdminRoleMatrixRows();
    const row = await this.matrixRowRepository.findOne({ where: { role, isActive: true } });
    if (!row) {
      throw new BadRequestException(
        'El rol está desactivado en la matriz de permisos o no está disponible',
      );
    }
  }

  async createStaffUser(dto: CreateStaffUserDto, adminUserId: number) {
    await this.assertRoleAssignable(dto.role);
    const existingEmail = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingEmail) {
      throw new ConflictException('Ya existe una cuenta con este correo electrónico');
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

  async updateStaffUser(id: number, dto: UpdateStaffUserDto, adminUserId: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === UserRole.PATIENT) {
      throw new BadRequestException('No puede editar pacientes desde esta pantalla');
    }
    if (dto.role !== undefined) {
      await this.assertRoleAssignable(dto.role);
    }
    if (user.role === UserRole.ADMIN && dto.role && dto.role !== UserRole.ADMIN) {
      throw new BadRequestException('No puede degradar al administrador principal desde esta pantalla');
    }
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.fullName !== undefined) user.fullName = dto.fullName || null;
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

  async deleteStaffUser(id: number, adminUserId: number) {
    if (id === adminUserId) {
      throw new BadRequestException('No puede eliminar su propia cuenta');
    }
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === UserRole.PATIENT) {
      throw new BadRequestException('No puede eliminar pacientes desde esta pantalla');
    }
    if (user.role === UserRole.ADMIN) {
      const otherAdmins = await this.userRepository.count({
        where: { role: UserRole.ADMIN, isActive: true, id: Not(id) },
      });
      if (otherAdmins === 0) {
        throw new BadRequestException('No puede eliminar al único administrador activo');
      }
    }

    const ticketRefs = await this.ticketRepository.count({ where: { calledBy: id } });
    if (ticketRefs > 0) {
      throw new BadRequestException(
        'No se puede eliminar: el usuario figura como responsable de llamados en tickets históricos. Desactívelo.',
      );
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
}
