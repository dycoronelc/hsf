"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const monitor_controller_1 = require("./monitor.controller");
const monitor_service_1 = require("./monitor.service");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
const service_entity_1 = require("../services/entities/service.entity");
const preadmission_entity_1 = require("../preadmission/entities/preadmission.entity");
let MonitorModule = class MonitorModule {
};
exports.MonitorModule = MonitorModule;
exports.MonitorModule = MonitorModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([ticket_entity_1.Ticket, service_entity_1.Service, preadmission_entity_1.Preadmission])],
        controllers: [monitor_controller_1.MonitorController],
        providers: [monitor_service_1.MonitorService],
    })
], MonitorModule);
//# sourceMappingURL=monitor.module.js.map