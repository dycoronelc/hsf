import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import type { AdminPermissionKey } from '../admin/permission-catalog';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const keys = this.reflector.getAllAndOverride<AdminPermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!keys?.length) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: string; isActive?: boolean } | undefined;
    if (!user?.role) {
      throw new ForbiddenException('Autenticación requerida');
    }
    if (user.isActive === false) {
      throw new ForbiddenException('Cuenta desactivada');
    }

    for (const key of keys) {
      const ok = await this.permissionsService.userHasPermission(user.role, key);
      if (!ok) {
        throw new ForbiddenException('No tiene permiso para esta operación');
      }
    }
    return true;
  }
}
