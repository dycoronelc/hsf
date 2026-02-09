import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Service, Preadmission])],
  controllers: [MonitorController],
  providers: [MonitorService],
})
export class MonitorModule {}
