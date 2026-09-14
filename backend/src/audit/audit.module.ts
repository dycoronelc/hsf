import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditSchemaBootstrap } from './audit-schema.bootstrap';
import { PermissionsModule } from '../permissions/permissions.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User]), PermissionsModule],
  controllers: [AuditController],
  providers: [AuditService, AuditSchemaBootstrap],
  exports: [AuditService],
})
export class AuditModule {}
