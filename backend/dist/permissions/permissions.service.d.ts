import { Repository } from 'typeorm';
import { RolePermission } from '../admin/entities/role-permission.entity';
import { AdminRoleMatrixRow } from '../admin/entities/admin-role-matrix-row.entity';
import { AdminPermissionKey } from '../admin/permission-catalog';
export declare class PermissionsService {
    private rolePermissionRepository;
    private matrixRowRepository;
    constructor(rolePermissionRepository: Repository<RolePermission>, matrixRowRepository: Repository<AdminRoleMatrixRow>);
    private isAllowedByDefault;
    private migrateLegacyMatrixIfNeeded;
    private seedMatrixRows;
    private ensureMatrixSeeded;
    userHasPermission(role: string, permissionKey: AdminPermissionKey): Promise<boolean>;
}
