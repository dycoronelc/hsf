import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationLog } from './entities/integration-log.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';

/**
 * Integración unidireccional hacia Cellbyte (PDF requisitos): JSON por HTTPS, bitácora y reintentos.
 * Si CELLBYTE_URL no está definido, solo registra en bitácora (stub).
 */
@Injectable()
export class CellbyteService {
  private readonly logger = new Logger(CellbyteService.name);

  constructor(
    @InjectRepository(IntegrationLog)
    private logRepository: Repository<IntegrationLog>,
  ) {}

  buildPayload(p: Preadmission): Record<string, unknown> {
    return {
      idPreadmision: p.id,
      departamento: p.departamento,
      cedula: p.cedula,
      tipoIdentificacion: p.pasaporte,
      nombres: [p.name1, p.name2].filter(Boolean).join(' '),
      apellidos: [p.apellido1, p.apellido2].filter(Boolean).join(' '),
      email: p.email,
      celular: p.celular,
      doblecobertura: p.doblecobertura,
      compania1: p.compania1,
      poliza1: p.poliza1,
      fechapreadmision: p.fechapreadmision?.toISOString?.() ?? String(p.fechapreadmision),
      estadoLlegada: p.arrivalState,
    };
  }

  async sendPreadmission(preadmission: Preadmission, attempt = 1): Promise<void> {
    const payload = this.buildPayload(preadmission);
    const url = process.env.CELLBYTE_URL;
    let success = false;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    if (url) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        responseBody = await res.text().catch(() => null);
        success = res.ok;
        if (!success) {
          errorMessage = `HTTP ${res.status}`;
        }
      } catch (e) {
        errorMessage = e instanceof Error ? e.message : String(e);
      }
    } else {
      success = true;
      responseBody = JSON.stringify({ stub: true, message: 'CELLBYTE_URL no configurado' });
    }

    await this.logRepository.save(
      this.logRepository.create({
        integration: 'cellbyte',
        preadmissionId: preadmission.id,
        requestPayload: JSON.stringify(payload),
        responseBody,
        success,
        attempt,
        errorMessage,
      }),
    );

    if (!success && attempt < 3 && url) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return this.sendPreadmission(preadmission, attempt + 1);
    }

    if (!success && url) {
      this.logger.warn(`Cellbyte falló tras reintentos preadmissionId=${preadmission.id}`);
    }
  }
}
