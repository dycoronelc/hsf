import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreadmissionController } from './preadmission.controller';
import { PreadmissionService } from './preadmission.service';
import { Preadmission } from './entities/preadmission.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Preadmission]),
    IntegrationsModule,
    TicketsModule,
  ],
  controllers: [PreadmissionController],
  providers: [PreadmissionService],
})
export class PreadmissionModule {}
