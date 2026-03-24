import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationLog } from './entities/integration-log.entity';
import { CellbyteService } from './cellbyte.service';

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationLog])],
  providers: [CellbyteService],
  exports: [CellbyteService],
})
export class IntegrationsModule {}
