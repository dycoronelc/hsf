import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Survey } from '../surveys/entities/survey.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { User } from '../users/entities/user.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Survey, Service, Preadmission, User]),
    PermissionsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
