import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../admin/entities/role-permission.entity';
import { AdminRoleMatrixRow } from '../admin/entities/admin-role-matrix-row.entity';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  ADMIN_PERMISSION_CATALOG,
  AdminPermissionKey,
} from '../admin/permission-catalog';
import { UserRole } from '../common/enums';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(AdminRoleMatrixRow)
    private matrixRowRepository: Repository<AdminRoleMatrixRow>,
  ) {}

  private isAllowedByDefault(role: UserRole, permissionKey: AdminPermissionKey): boolean {
    const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    return defaults.includes(permissionKey);
  }

  private coerceAllowed(value: unknown): boolean {
    if (value === true || value === 1 || value === '1' || value === 't' || value === 'true') {
      return true;
    }
    return false;
  }

  private async migrateLegacyMatrixIfNeeded(): Promise<void> {
    const permCount = await this.rolePermissionRepository.count();
    const matrixCount = await this.matrixRowRepository.count();
    if (permCount > 0 && matrixCount === 0) {
      await this.seedMatrixRows();
    }
  }

  private async seedMatrixRows(): Promise<void> {
    for (const role of CONFIGURABLE_ROLES) {
      const exists = await this.matrixRowRepository.findOne({ where: { role } });
      if (!exists) {
        await this.matrixRowRepository.save(
          this.matrixRowRepository.create({ role, isActive: true }),
        );
      }
    }
  }

  private async ensureMatrixSeeded(): Promise<void> {
    await this.migrateLegacyMatrixIfNeeded();
    const count = await this.matrixRowRepository.count();
    if (count === 0) {
      await this.seedMatrixRows();
    }
  }

  /**
   * Resolución efectiva del permiso: administrador siempre permitido; paciente nunca;
   * rol inactivo o fuera de matriz → denegado;
   * si hay fila en role_permissions se usa `allowed` (incluye false explícito);
   * si no hay fila, catálogo por defecto.
   */
  async userHasPermission(role: string, permissionKey: AdminPermissionKey): Promise<boolean> {
    const roleNorm = String(role ?? '').trim().toLowerCase();
    if (roleNorm === 'admin') {
      return true;
    }
    if (roleNorm === 'patient') {
      return false;
    }

    try {
      await this.ensureMatrixSeeded();

      const matrixRow = await this.matrixRowRepository.findOne({ where: { role: roleNorm } });
      if (!matrixRow) {
        // Fallback al catálogo si el rol aún no está en matriz (p. ej. datos legacy)
        return this.isAllowedByDefault(roleNorm as UserRole, permissionKey);
      }
      if (!matrixRow.isActive) {
        return false;
      }

      const stored = await this.rolePermissionRepository.findOne({
        where: { role: roleNorm, permissionKey },
      });
      if (stored) {
        return this.coerceAllowed(stored.allowed);
      }
      return this.isAllowedByDefault(roleNorm as UserRole, permissionKey);
    } catch {
      return this.isAllowedByDefault(roleNorm as UserRole, permissionKey);
    }
  }

  /** Claves de permiso efectivamente concedidas al rol (para menú y redirección en frontend). */
  async listAllowedPermissionKeys(role: string): Promise<AdminPermissionKey[]> {
    const roleNorm = String(role ?? '').trim().toLowerCase();
    if (roleNorm === 'admin') {
      return ADMIN_PERMISSION_CATALOG.map((p) => p.key);
    }
    if (roleNorm === 'patient' || !roleNorm) {
      return [];
    }

    const keys: AdminPermissionKey[] = [];
    for (const p of ADMIN_PERMISSION_CATALOG) {
      if (await this.userHasPermission(roleNorm, p.key)) {
        keys.push(p.key);
      }
    }
    return keys;
  }
}
