import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermission } from '../admin/entities/role-permission.entity';
import { AdminRoleMatrixRow } from '../admin/entities/admin-role-matrix-row.entity';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermission, AdminRoleMatrixRow])],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
