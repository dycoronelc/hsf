import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { OpsService } from './ops.service';
import { OpsController } from './ops.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket]), PermissionsModule],
  controllers: [OpsController],
  providers: [OpsService],
  exports: [OpsService],
})
export class OpsModule {}
