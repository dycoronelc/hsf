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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CellbyteController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../permissions/permissions.guard");
const require_permissions_decorator_1 = require("../permissions/require-permissions.decorator");
const cellbyte_service_1 = require("./cellbyte.service");
let CellbyteController = class CellbyteController {
    constructor(cellbyteService) {
        this.cellbyteService = cellbyteService;
    }
    checkConnectivity() {
        return this.cellbyteService.checkConnectivity();
    }
};
exports.CellbyteController = CellbyteController;
__decorate([
    (0, common_1.Get)('connectivity'),
    (0, require_permissions_decorator_1.RequirePermissions)('review_preadmissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CellbyteController.prototype, "checkConnectivity", null);
exports.CellbyteController = CellbyteController = __decorate([
    (0, common_1.Controller)('integrations/cellbyte'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [cellbyte_service_1.CellbyteService])
], CellbyteController);
//# sourceMappingURL=cellbyte.controller.js.map