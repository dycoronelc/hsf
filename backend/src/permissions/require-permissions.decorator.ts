import { SetMetadata } from '@nestjs/common';
import type { AdminPermissionKey } from '../admin/permission-catalog';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** El usuario debe tener todos los permisos listados (AND). */
export const RequirePermissions = (...permissions: AdminPermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
