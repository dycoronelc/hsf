import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreadmissionController } from './preadmission.controller';
import { PreadmissionService } from './preadmission.service';
import { Preadmission } from './entities/preadmission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Preadmission])],
  controllers: [PreadmissionController],
  providers: [PreadmissionService],
})
export class PreadmissionModule {}
