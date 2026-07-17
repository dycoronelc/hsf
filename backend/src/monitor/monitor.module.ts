import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { MonitorMediaService } from './monitor-media.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Service } from '../services/entities/service.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { MonitorMedia } from './entities/monitor-media.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Service, Preadmission, MonitorMedia]),
    SettingsModule,
  ],
  controllers: [MonitorController],
  providers: [MonitorService, MonitorMediaService],
  exports: [MonitorMediaService],
})
export class MonitorModule {}