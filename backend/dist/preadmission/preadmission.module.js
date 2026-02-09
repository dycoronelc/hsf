"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreadmissionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const preadmission_controller_1 = require("./preadmission.controller");
const preadmission_service_1 = require("./preadmission.service");
const preadmission_entity_1 = require("./entities/preadmission.entity");
let PreadmissionModule = class PreadmissionModule {
};
exports.PreadmissionModule = PreadmissionModule;
exports.PreadmissionModule = PreadmissionModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([preadmission_entity_1.Preadmission])],
        controllers: [preadmission_controller_1.PreadmissionController],
        providers: [preadmission_service_1.PreadmissionService],
    })
], PreadmissionModule);
//# sourceMappingURL=preadmission.module.js.map