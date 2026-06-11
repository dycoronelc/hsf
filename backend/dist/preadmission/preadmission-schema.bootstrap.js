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
var PreadmissionSchemaBootstrap_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreadmissionSchemaBootstrap = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
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
let PreadmissionSchemaBootstrap = PreadmissionSchemaBootstrap_1 = class PreadmissionSchemaBootstrap {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(PreadmissionSchemaBootstrap_1.name);
    }
    async onModuleInit() {
        for (const sql of SCHEMA_PATCH_STATEMENTS) {
            try {
                await this.dataSource.query(sql);
            }
            catch (err) {
                this.logger.warn(`No se pudo aplicar parche de esquema: ${sql.slice(0, 72)}…`, err instanceof Error ? err.message : err);
            }
        }
        this.logger.log('Parche de esquema preadmissions verificado');
    }
};
exports.PreadmissionSchemaBootstrap = PreadmissionSchemaBootstrap;
exports.PreadmissionSchemaBootstrap = PreadmissionSchemaBootstrap = PreadmissionSchemaBootstrap_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], PreadmissionSchemaBootstrap);
//# sourceMappingURL=preadmission-schema.bootstrap.js.map