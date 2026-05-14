import type { AdminPermissionKey } from '../admin/permission-catalog';
export declare const PERMISSIONS_KEY = "requiredPermissions";
export declare const RequirePermissions: (...permissions: AdminPermissionKey[]) => import("@nestjs/common").CustomDecorator<string>;
