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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorController = void 0;
const common_1 = require("@nestjs/common");
const monitor_service_1 = require("./monitor.service");
let MonitorController = class MonitorController {
    constructor(monitorService) {
        this.monitorService = monitorService;
    }
    async getQueue(serviceId) {
        return this.monitorService.getQueue(+serviceId);
    }
    async getAllQueues() {
        return this.monitorService.getAllQueues();
    }
    async getPreadmissions() {
        return this.monitorService.getPreadmissionsForMonitor();
    }
};
exports.MonitorController = MonitorController;
__decorate([
    (0, common_1.Get)('queue/:serviceId'),
    __param(0, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MonitorController.prototype, "getQueue", null);
__decorate([
    (0, common_1.Get)('all-queues'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitorController.prototype, "getAllQueues", null);
__decorate([
    (0, common_1.Get)('preadmissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitorController.prototype, "getPreadmissions", null);
exports.MonitorController = MonitorController = __decorate([
    (0, common_1.Controller)('monitor'),
    __metadata("design:paramtypes", [monitor_service_1.MonitorService])
], MonitorController);
//# sourceMappingURL=monitor.controller.js.map