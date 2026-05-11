import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { Survey } from './entities/survey.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Survey, Ticket]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
