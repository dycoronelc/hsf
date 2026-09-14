import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

const STATEMENTS = [
  `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "ipAddress" VARCHAR(64)`,
  `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "module" VARCHAR(120)`,
];

@Injectable()
export class AuditSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(AuditSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    for (const sql of STATEMENTS) {
      try {
        await this.dataSource.query(sql);
      } catch (err) {
        this.logger.warn(`No se pudo aplicar: ${sql} — ${err}`);
      }
    }
    this.logger.log('Parche de esquema audit_logs verificado');
  }
}
