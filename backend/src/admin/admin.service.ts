import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Service } from '../services/entities/service.entity';
import { RolePermission } from './entities/role-permission.entity';
import { User } from '../users/entities/user.entity';
import {
  ADMIN_PERMISSION_CATALOG,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  AdminPermissionKey,
} from './permission-catalog';
import { UserRole } from '../common/enums';
import {
  CreateTicketTypeDto,
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

  async ensureDefaultPermissions() {
    const existing = await this.rolePermissionRepository.count();
    if (existing > 0) return;

    const rows: RolePermission[] = [];
    for (const role of CONFIGURABLE_ROLES) {
      for (const permission of ADMIN_PERMISSION_CATALOG) {
        rows.push(
          this.rolePermissionRepository.create({
            role,
            permissionKey: permission.key,
            allowed: this.isAllowedByDefault(role, permission.key),
          }),
        );
      }
    }
    await this.rolePermissionRepository.save(rows);
  }

  async getRolePermissionsMatrix() {
    await this.ensureDefaultPermissions();
    const stored = await this.rolePermissionRepository.find();
    const matrix: Record<string, Record<string, boolean>> = {};

    for (const role of CONFIGURABLE_ROLES) {
      matrix[role] = {};
      for (const permission of ADMIN_PERMISSION_CATALOG) {
        const row = stored.find((r) => r.role === role && r.permissionKey === permission.key);
        matrix[role][permission.key] =
          row?.allowed ?? this.isAllowedByDefault(role, permission.key);
      }
    }

    return {
      permissions: ADMIN_PERMISSION_CATALOG,
      roles: CONFIGURABLE_ROLES,
      matrix,
    };
  }

  async updateRolePermissions(dto: UpdateRolePermissionsDto, adminUserId: number) {
    if (dto.role === UserRole.ADMIN || dto.role === UserRole.PATIENT) {
      throw new BadRequestException('Este rol no se configura desde la matriz de permisos');
    }
    if (!CONFIGURABLE_ROLES.includes(dto.role)) {
      throw new BadRequestException('Rol no configurable');
    }

    await this.ensureDefaultPermissions();

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

  async listStaffUsers() {
    return this.userRepository.find({
      where: { role: Not(UserRole.PATIENT) },
      order: { fullName: 'ASC', email: 'ASC' },
      select: ['id', 'email', 'fullName', 'role', 'isActive', 'createdAt'],
    });
  }

  async updateStaffUser(id: number, dto: UpdateStaffUserDto, adminUserId: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === UserRole.ADMIN && dto.role && dto.role !== UserRole.ADMIN) {
      throw new BadRequestException('No puede degradar al administrador principal desde esta pantalla');
    }
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
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
}
