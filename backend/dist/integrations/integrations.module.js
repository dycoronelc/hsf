"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const integration_log_entity_1 = require("./entities/integration-log.entity");
const cellbyte_service_1 = require("./cellbyte.service");
const cellbyte_controller_1 = require("./cellbyte.controller");
const permissions_module_1 = require("../permissions/permissions.module");
const integrations_schema_bootstrap_1 = require("./integrations-schema.bootstrap");
let IntegrationsModule = class IntegrationsModule {
};
exports.IntegrationsModule = IntegrationsModule;
exports.IntegrationsModule = IntegrationsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([integration_log_entity_1.IntegrationLog]), permissions_module_1.PermissionsModule],
        controllers: [cellbyte_controller_1.CellbyteController],
        providers: [cellbyte_service_1.CellbyteService, integrations_schema_bootstrap_1.IntegrationsSchemaBootstrap],
        exports: [cellbyte_service_1.CellbyteService],
    })
], IntegrationsModule);
//# sourceMappingURL=integrations.module.js.map