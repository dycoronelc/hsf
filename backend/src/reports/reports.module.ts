import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Survey } from '../surveys/entities/survey.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Appointment, Survey, Service, Preadmission])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
