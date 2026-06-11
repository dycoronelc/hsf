import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationLog } from './entities/integration-log.entity';
import { Preadmission } from '../preadmission/entities/preadmission.entity';
import { getCellbyteConfig, isCellbyteConfigured } from './cellbyte.config';
import { buildCellbytePayload } from './cellbyte-payload.util';

export type CellbyteSendResult = {
  success: boolean;
  skipped: boolean;
  errorMessage?: string | null;
};

export type CellbyteConnectivityResult = {
  configured: boolean;
  baseUrl: string | null;
  reachable: boolean;
  authOk: boolean;
  credentialsConfigured: boolean;
  message: string;
  checkedAt: string;
  httpStatus?: number;
};

type CellbyteAuthResponse = {
  token?: string;
};

const CONNECTIVITY_TIMEOUT_MS = 8_000;
const SEND_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;

@Injectable()
export class CellbyteService {
  private readonly logger = new Logger(CellbyteService.name);

  constructor(
    @InjectRepository(IntegrationLog)
    private logRepository: Repository<IntegrationLog>,
  ) {}

  buildPayload(p: Preadmission): Record<string, string> {
    return buildCellbytePayload(p);
  }

  async checkConnectivity(): Promise<CellbyteConnectivityResult> {
    const checkedAt = new Date().toISOString();
    const config = getCellbyteConfig();

    if (!config) {
      return {
        configured: false,
        baseUrl: null,
        reachable: false,
        authOk: false,
        credentialsConfigured: false,
        message:
          'Cellbyte no está configurado. Defina CELLBYTE_BASE_URL (ej. http://192.168.30.41:8080/cbUat).',
        checkedAt,
      };
    }

    const credentialsConfigured = Boolean(config.username && config.password);
    if (!credentialsConfigured) {
      return {
        configured: true,
        baseUrl: config.baseUrl,
        reachable: false,
        authOk: false,
        credentialsConfigured: false,
        message:
          'CELLBYTE_BASE_URL definido, pero faltan CELLBYTE_USERNAME y/o CELLBYTE_PASSWORD.',
        checkedAt,
      };
    }

    try {
      const { response, bodyText } = await this.fetchWithTimeout(
        config.authUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            username: config.username,
            password: config.password,
          }),
        },
        CONNECTIVITY_TIMEOUT_MS,
      );

      const reachable = true;
      const authOk = response.ok && Boolean(this.parseToken(bodyText));

      if (authOk) {
        return {
          configured: true,
          baseUrl: config.baseUrl,
          reachable,
          authOk: true,
          credentialsConfigured: true,
          message: 'Conexión exitosa con Cellbyte (autenticación OK).',
          checkedAt,
          httpStatus: response.status,
        };
      }

      if (response.status >= 400 && response.status < 500) {
        return {
          configured: true,
          baseUrl: config.baseUrl,
          reachable,
          authOk: false,
          credentialsConfigured: true,
          message: `Cellbyte responde pero la autenticación falló (HTTP ${response.status}). Revise credenciales.`,
          checkedAt,
          httpStatus: response.status,
        };
      }

      return {
        configured: true,
        baseUrl: config.baseUrl,
        reachable,
        authOk: false,
        credentialsConfigured: true,
        message: `Cellbyte respondió con HTTP ${response.status}.`,
        checkedAt,
        httpStatus: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const unreachableHint = this.unreachableMessage(errorMessage);

      return {
        configured: true,
        baseUrl: config.baseUrl,
        reachable: false,
        authOk: false,
        credentialsConfigured: true,
        message: unreachableHint,
        checkedAt,
      };
    }
  }

  async sendPreadmission(preadmission: Preadmission, attempt = 1): Promise<CellbyteSendResult> {
    const config = getCellbyteConfig();
    const payload = this.buildPayload(preadmission);
    const payloadForLog = {
      ...payload,
      cedulaimagen: payload.cedulaimagen ? `[base64 ${payload.cedulaimagen.length} chars]` : '',
      ordenimagen: payload.ordenimagen ? `[base64 ${payload.ordenimagen.length} chars]` : '',
      ssimagen: payload.ssimagen ? `[base64 ${payload.ssimagen.length} chars]` : '',
    };

    if (!config) {
      await this.writeLog({
        preadmissionId: preadmission.id,
        requestPayload: JSON.stringify(payloadForLog),
        responseBody: JSON.stringify({
          skipped: true,
          reason: 'CELLBYTE_BASE_URL no configurado',
        }),
        success: true,
        attempt,
        errorMessage: null,
      });

      return { success: true, skipped: true };
    }

    if (!config.username || !config.password) {
      const message = 'Credenciales Cellbyte incompletas (CELLBYTE_USERNAME / CELLBYTE_PASSWORD)';
      await this.writeLog({
        preadmissionId: preadmission.id,
        requestPayload: JSON.stringify(payloadForLog),
        responseBody: null,
        success: false,
        attempt,
        errorMessage: message,
      });
      this.logger.warn(`${message} preadmissionId=${preadmission.id}`);
      return { success: false, skipped: false, errorMessage: message };
    }

    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let success = false;

    try {
      const token = await this.fetchAuthToken(config);
      if (!token) {
        throw new Error('Cellbyte no devolvió token de autenticación');
      }

      const innerJson = JSON.stringify(payload);
      const { response, bodyText } = await this.fetchWithTimeout(
        config.preAdmissionUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ json: innerJson }),
        },
        SEND_TIMEOUT_MS,
      );

      responseBody = bodyText;
      success = response.ok;
      if (!success) {
        errorMessage = this.extractErrorMessage(bodyText, response.status);
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      responseBody = responseBody ?? JSON.stringify({ error: errorMessage });
    }

    await this.writeLog({
      preadmissionId: preadmission.id,
      requestPayload: JSON.stringify(payloadForLog),
      responseBody,
      success,
      attempt,
      errorMessage,
    });

    if (!success && attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      return this.sendPreadmission(preadmission, attempt + 1);
    }

    if (!success) {
      this.logger.warn(
        `Cellbyte falló tras reintentos preadmissionId=${preadmission.id}: ${errorMessage ?? 'error desconocido'}`,
      );
    }

    return { success, skipped: false, errorMessage };
  }

  isConfigured(): boolean {
    return isCellbyteConfigured();
  }

  private async fetchAuthToken(
    config: NonNullable<ReturnType<typeof getCellbyteConfig>>,
  ): Promise<string | null> {
    const { response, bodyText } = await this.fetchWithTimeout(
      config.authUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          username: config.username,
          password: config.password,
        }),
      },
      CONNECTIVITY_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error(
        this.extractErrorMessage(bodyText, response.status) ||
          `Autenticación Cellbyte falló (HTTP ${response.status})`,
      );
    }

    return this.parseToken(bodyText);
  }

  private parseToken(bodyText: string): string | null {
    try {
      const parsed = JSON.parse(bodyText) as CellbyteAuthResponse;
      return typeof parsed.token === 'string' && parsed.token.trim() ? parsed.token.trim() : null;
    } catch {
      return null;
    }
  }

  private extractErrorMessage(bodyText: string, status: number): string {
    try {
      const parsed = JSON.parse(bodyText) as { message?: string; title?: string };
      if (parsed.message) return parsed.message;
      if (parsed.title) return `${parsed.title} (HTTP ${status})`;
    } catch {
      // ignore parse errors
    }
    return `HTTP ${status}`;
  }

  private unreachableMessage(errorMessage: string): string {
    const lower = errorMessage.toLowerCase();
    if (
      lower.includes('abort') ||
      lower.includes('timeout') ||
      lower.includes('etimedout') ||
      lower.includes('econnrefused') ||
      lower.includes('enotfound') ||
      lower.includes('network') ||
      lower.includes('fetch failed')
    ) {
      return `No se puede alcanzar Cellbyte desde este servidor (${errorMessage}). Es normal si el API corre en la red local del hospital (192.168.x.x) y el backend está en la nube.`;
    }
    return `Error de conexión con Cellbyte: ${errorMessage}`;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<{ response: Response; bodyText: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const bodyText = await response.text().catch(() => '');
      return { response, bodyText };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async writeLog(input: {
    preadmissionId: number;
    requestPayload: string;
    responseBody: string | null;
    success: boolean;
    attempt: number;
    errorMessage: string | null;
  }): Promise<void> {
    await this.logRepository.save(
      this.logRepository.create({
        integration: 'cellbyte',
        preadmissionId: input.preadmissionId,
        requestPayload: input.requestPayload,
        responseBody: input.responseBody,
        success: input.success,
        attempt: input.attempt,
        errorMessage: input.errorMessage,
      }),
    );
  }
}
