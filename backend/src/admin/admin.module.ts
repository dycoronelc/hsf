import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../permissions/permissions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Service } from '../services/entities/service.entity';
import { RolePermission } from './entities/role-permission.entity';
import { AdminRoleMatrixRow } from './entities/admin-role-matrix-row.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { MonitorModule } from '../monitor/monitor.module';

@Module({
  imports: [
    PermissionsModule,
    MonitorModule,
    TypeOrmModule.forFeature([
      Service,
      RolePermission,
      AdminRoleMatrixRow,
      User,
      Ticket,
      Notification,
      PasswordResetToken,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
