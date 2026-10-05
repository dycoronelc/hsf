import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { PreadmissionService } from './preadmission/preadmission.service';

/**
 * Reenvía a Cellbyte preadmisiones rechazadas por estadocivil (VD → VP)
 * o los ids pasados por argumento.
 *
 *   node dist/resend-cellbyte-cli.js
 *   node dist/resend-cellbyte-cli.js 42
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const service = app.get(PreadmissionService);
    const explicit = process.argv
      .slice(2)
      .map((value) => Number(value))
      .filter((id) => Number.isInteger(id) && id > 0);

    let ids = explicit;
    if (!ids.length) {
      const dataSource = app.get(DataSource);
      const rows: Array<{ id: number }> = await dataSource.query(
        `
        SELECT DISTINCT "preadmissionId" AS id
        FROM integration_logs
        WHERE integration = 'cellbyte'
          AND success = false
          AND "errorMessage" ILIKE '%estadocivil%'
          AND "preadmissionId" IS NOT NULL
        ORDER BY 1
        `,
      );
      ids = rows.map((row) => Number(row.id)).filter((id) => id > 0);
    }

    if (!ids.length) {
      console.log('No hay preadmisiones rechazadas por estadocivil.');
      return;
    }

    for (const id of ids) {
      const result = await service.resendToCellbyte(id);
      console.log(JSON.stringify(result));
      if (!result.success || result.skipped) {
        process.exitCode = 1;
      }
    }
  } catch (error) {
    console.error('Error reenviando a Cellbyte:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
