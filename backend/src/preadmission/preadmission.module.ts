import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreadmissionController } from './preadmission.controller';
import { PreadmissionService } from './preadmission.service';
import { Preadmission } from './entities/preadmission.entity';
import { VerificationCode } from '../auth/entities/verification-code.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Preadmission, VerificationCode]),
    PermissionsModule,
    IntegrationsModule,
    TicketsModule,
  ],
  controllers: [PreadmissionController],
  providers: [PreadmissionService],
})
export class PreadmissionModule {}
