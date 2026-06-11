"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CellbyteService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CellbyteService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const integration_log_entity_1 = require("./entities/integration-log.entity");
const cellbyte_config_1 = require("./cellbyte.config");
const cellbyte_payload_util_1 = require("./cellbyte-payload.util");
const CONNECTIVITY_TIMEOUT_MS = 8_000;
const SEND_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;
let CellbyteService = CellbyteService_1 = class CellbyteService {
    constructor(logRepository) {
        this.logRepository = logRepository;
        this.logger = new common_1.Logger(CellbyteService_1.name);
    }
    buildPayload(p) {
        return (0, cellbyte_payload_util_1.buildCellbytePayload)(p);
    }
    getPostmanExport(preadmission) {
        const payload = this.buildPayload(preadmission);
        const innerJson = JSON.stringify(payload);
        const config = (0, cellbyte_config_1.getCellbyteConfig)();
        return {
            preadmissionId: preadmission.id,
            generatedAt: new Date().toISOString(),
            cellbyte: {
                baseUrl: config?.baseUrl ?? null,
                authUrl: config?.authUrl ?? null,
                preAdmissionUrl: config?.preAdmissionUrl ?? null,
            },
            payload,
            postmanBody: { json: innerJson },
            attachmentSizes: {
                cedulaimagen: payload.cedulaimagen.length,
                ordenimagen: payload.ordenimagen.length,
                ssimagen: payload.ssimagen.length,
            },
            usage: {
                step1: `POST ${config?.authUrl ?? '{CELLBYTE_BASE_URL}/api/v1/auth'} con username/password → copiar token`,
                step2: `POST ${config?.preAdmissionUrl ?? '{CELLBYTE_BASE_URL}/api/v1/pre-admission'} con Authorization Bearer y body = postmanBody`,
            },
        };
    }
    async checkConnectivity() {
        const checkedAt = new Date().toISOString();
        const config = (0, cellbyte_config_1.getCellbyteConfig)();
        if (!config) {
            return {
                configured: false,
                baseUrl: null,
                reachable: false,
                authOk: false,
                credentialsConfigured: false,
                message: 'Cellbyte no está configurado. Defina CELLBYTE_BASE_URL (ej. http://192.168.30.41:8080/cbUat).',
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
                message: 'CELLBYTE_BASE_URL definido, pero faltan CELLBYTE_USERNAME y/o CELLBYTE_PASSWORD.',
                checkedAt,
            };
        }
        try {
            const { response, bodyText } = await this.fetchWithTimeout(config.authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    username: config.username,
                    password: config.password,
                }),
            }, CONNECTIVITY_TIMEOUT_MS);
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
        }
        catch (error) {
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
    async sendPreadmission(preadmission, attempt = 1) {
        const config = (0, cellbyte_config_1.getCellbyteConfig)();
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
        let responseBody = null;
        let errorMessage = null;
        let success = false;
        try {
            const token = await this.fetchAuthToken(config);
            if (!token) {
                throw new Error('Cellbyte no devolvió token de autenticación');
            }
            const innerJson = JSON.stringify(payload);
            const { response, bodyText } = await this.fetchWithTimeout(config.preAdmissionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ json: innerJson }),
            }, SEND_TIMEOUT_MS);
            responseBody = bodyText;
            success = response.ok;
            if (!success) {
                errorMessage = this.extractErrorMessage(bodyText, response.status);
            }
        }
        catch (error) {
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
            this.logger.warn(`Cellbyte falló tras reintentos preadmissionId=${preadmission.id}: ${errorMessage ?? 'error desconocido'}`);
        }
        return { success, skipped: false, errorMessage };
    }
    isConfigured() {
        return (0, cellbyte_config_1.isCellbyteConfigured)();
    }
    async fetchAuthToken(config) {
        const { response, bodyText } = await this.fetchWithTimeout(config.authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                username: config.username,
                password: config.password,
            }),
        }, CONNECTIVITY_TIMEOUT_MS);
        if (!response.ok) {
            throw new Error(this.extractErrorMessage(bodyText, response.status) ||
                `Autenticación Cellbyte falló (HTTP ${response.status})`);
        }
        return this.parseToken(bodyText);
    }
    parseToken(bodyText) {
        try {
            const parsed = JSON.parse(bodyText);
            return typeof parsed.token === 'string' && parsed.token.trim() ? parsed.token.trim() : null;
        }
        catch {
            return null;
        }
    }
    extractErrorMessage(bodyText, status) {
        try {
            const parsed = JSON.parse(bodyText);
            if (parsed.message)
                return parsed.message;
            if (parsed.title)
                return `${parsed.title} (HTTP ${status})`;
        }
        catch {
        }
        return `HTTP ${status}`;
    }
    unreachableMessage(errorMessage) {
        const lower = errorMessage.toLowerCase();
        if (lower.includes('abort') ||
            lower.includes('timeout') ||
            lower.includes('etimedout') ||
            lower.includes('econnrefused') ||
            lower.includes('enotfound') ||
            lower.includes('network') ||
            lower.includes('fetch failed')) {
            return `No se puede alcanzar Cellbyte desde este servidor (${errorMessage}). Es normal si el API corre en la red local del hospital (192.168.x.x) y el backend está en la nube.`;
        }
        return `Error de conexión con Cellbyte: ${errorMessage}`;
    }
    async fetchWithTimeout(url, init, timeoutMs) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { ...init, signal: controller.signal });
            const bodyText = await response.text().catch(() => '');
            return { response, bodyText };
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async writeLog(input) {
        await this.logRepository.save(this.logRepository.create({
            integration: 'cellbyte',
            preadmissionId: input.preadmissionId,
            requestPayload: input.requestPayload,
            responseBody: input.responseBody,
            success: input.success,
            attempt: input.attempt,
            errorMessage: input.errorMessage,
        }));
    }
};
exports.CellbyteService = CellbyteService;
exports.CellbyteService = CellbyteService = CellbyteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(integration_log_entity_1.IntegrationLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CellbyteService);
//# sourceMappingURL=cellbyte.service.js.map