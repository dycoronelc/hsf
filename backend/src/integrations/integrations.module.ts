import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationLog } from './entities/integration-log.entity';
import { CellbyteService } from './cellbyte.service';
import { CellbyteController } from './cellbyte.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { IntegrationsSchemaBootstrap } from './integrations-schema.bootstrap';

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationLog]), PermissionsModule],
  controllers: [CellbyteController],
  providers: [CellbyteService, IntegrationsSchemaBootstrap],
  exports: [CellbyteService],
})
export class IntegrationsModule {}
