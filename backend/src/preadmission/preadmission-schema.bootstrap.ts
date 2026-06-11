import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

const SCHEMA_PATCH_STATEMENTS = [
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "registradoComo" TEXT NOT NULL DEFAULT 'paciente'`,
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "procedimientoEstudio" TEXT`,
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "preautorizacion" VARCHAR(512)`,
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "certificadoSeguro" VARCHAR(512)`,
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "celularPrefix" TEXT DEFAULT '507'`,
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "arrivalState" TEXT NOT NULL DEFAULT 'espera_llegada'`,
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "confirmedArrivalAt" TIMESTAMP`,
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "confirmedArrivalByUserId" INTEGER`,
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "ticketId" INTEGER`,
  `ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS "cellbyteSentAt" TIMESTAMP`,
  `CREATE INDEX IF NOT EXISTS idx_preadmissions_arrival_state ON preadmissions ("arrivalState")`,
];

@Injectable()
export class PreadmissionSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(PreadmissionSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    for (const sql of SCHEMA_PATCH_STATEMENTS) {
      try {
        await this.dataSource.query(sql);
      } catch (err) {
        this.logger.warn(
          `No se pudo aplicar parche de esquema: ${sql.slice(0, 72)}…`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    this.logger.log('Parche de esquema preadmissions verificado');
  }
}
