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
var IntegrationsSchemaBootstrap_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsSchemaBootstrap = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
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
let IntegrationsSchemaBootstrap = IntegrationsSchemaBootstrap_1 = class IntegrationsSchemaBootstrap {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(IntegrationsSchemaBootstrap_1.name);
    }
    async onModuleInit() {
        for (const sql of INTEGRATION_SCHEMA_PATCH) {
            try {
                await this.dataSource.query(sql);
            }
            catch (err) {
                this.logger.warn('No se pudo aplicar parche integration_logs', err instanceof Error ? err.message : err);
            }
        }
    }
};
exports.IntegrationsSchemaBootstrap = IntegrationsSchemaBootstrap;
exports.IntegrationsSchemaBootstrap = IntegrationsSchemaBootstrap = IntegrationsSchemaBootstrap_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], IntegrationsSchemaBootstrap);
//# sourceMappingURL=integrations-schema.bootstrap.js.map