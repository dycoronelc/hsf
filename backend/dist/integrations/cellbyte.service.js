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
let CellbyteService = CellbyteService_1 = class CellbyteService {
    constructor(logRepository) {
        this.logRepository = logRepository;
        this.logger = new common_1.Logger(CellbyteService_1.name);
    }
    buildPayload(p) {
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
    async sendPreadmission(preadmission, attempt = 1) {
        const payload = this.buildPayload(preadmission);
        const url = process.env.CELLBYTE_URL;
        let success = false;
        let responseBody = null;
        let errorMessage = null;
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
            }
            catch (e) {
                errorMessage = e instanceof Error ? e.message : String(e);
            }
        }
        else {
            success = true;
            responseBody = JSON.stringify({ stub: true, message: 'CELLBYTE_URL no configurado' });
        }
        await this.logRepository.save(this.logRepository.create({
            integration: 'cellbyte',
            preadmissionId: preadmission.id,
            requestPayload: JSON.stringify(payload),
            responseBody,
            success,
            attempt,
            errorMessage,
        }));
        if (!success && attempt < 3 && url) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            return this.sendPreadmission(preadmission, attempt + 1);
        }
        if (!success && url) {
            this.logger.warn(`Cellbyte falló tras reintentos preadmissionId=${preadmission.id}`);
        }
    }
};
exports.CellbyteService = CellbyteService;
exports.CellbyteService = CellbyteService = CellbyteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(integration_log_entity_1.IntegrationLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CellbyteService);
//# sourceMappingURL=cellbyte.service.js.map