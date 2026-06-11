import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreadmissionController } from './preadmission.controller';
import { PreadmissionService } from './preadmission.service';
import { Preadmission } from './entities/preadmission.entity';
import { VerificationCode } from '../auth/entities/verification-code.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PreadmissionStorageService } from './preadmission-storage.service';
import { PreadmissionSchemaBootstrap } from './preadmission-schema.bootstrap';

@Module({
  imports: [
    TypeOrmModule.forFeature([Preadmission, VerificationCode]),
    PermissionsModule,
    IntegrationsModule,
    TicketsModule,
    NotificationsModule,
  ],
  controllers: [PreadmissionController],
  providers: [PreadmissionService, PreadmissionStorageService, PreadmissionSchemaBootstrap],
})
export class PreadmissionModule {}
