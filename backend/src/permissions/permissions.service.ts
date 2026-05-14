import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../admin/entities/role-permission.entity';
import { AdminRoleMatrixRow } from '../admin/entities/admin-role-matrix-row.entity';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
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

  /**
   * Alineado con AdminService: si hay permisos guardados pero aún no existe la tabla de matriz,
   * se crean filas por rol configurable.
   */
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

  /** Primera ejecución: matriz vacía → mismos roles que el panel de administración. */
  private async ensureMatrixSeeded(): Promise<void> {
    await this.migrateLegacyMatrixIfNeeded();
    const count = await this.matrixRowRepository.count();
    if (count === 0) {
      await this.seedMatrixRows();
    }
  }

  /**
   * Resolución efectiva del permiso: administrador siempre permitido; paciente nunca permisos de staff;
   * rol inactivo en matriz → denegado; sin fila en matriz (rol retirado) → denegado;
   * si hay fila en role_permissions se usa; si no, valor por defecto del catálogo.
   */
  async userHasPermission(role: string, permissionKey: AdminPermissionKey): Promise<boolean> {
    if (role === UserRole.ADMIN) {
      return true;
    }
    if (role === UserRole.PATIENT) {
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
    return this.isAllowedByDefault(role as UserRole, permissionKey);
  }
}
