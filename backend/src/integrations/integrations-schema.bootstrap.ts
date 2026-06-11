import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

const INTEGRATION_SCHEMA_PATCH = [
  `CREATE TABLE IF NOT EXISTS integration_logs (
    id SERIAL PRIMARY KEY,
    integration TEXT NOT NULL,
    "preadmissionId" INTEGER,
    "requestPayload" TEXT,
    "responseBody" TEXT,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    attempt INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_integration_logs_preadmissionid
    ON integration_logs ("preadmissionId")
    WHERE "preadmissionId" IS NOT NULL`,
];

@Injectable()
export class IntegrationsSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(IntegrationsSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    for (const sql of INTEGRATION_SCHEMA_PATCH) {
      try {
        await this.dataSource.query(sql);
      } catch (err) {
        this.logger.warn(
          'No se pudo aplicar parche integration_logs',
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
}
