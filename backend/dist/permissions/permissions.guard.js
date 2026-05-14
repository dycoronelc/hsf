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
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_service_1 = require("./permissions.service");
const require_permissions_decorator_1 = require("./require-permissions.decorator");
let PermissionsGuard = class PermissionsGuard {
    constructor(reflector, permissionsService) {
        this.reflector = reflector;
        this.permissionsService = permissionsService;
    }
    async canActivate(context) {
        const keys = this.reflector.getAllAndOverride(require_permissions_decorator_1.PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!keys?.length) {
            return true;
        }
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user?.role) {
            throw new common_1.ForbiddenException('Autenticación requerida');
        }
        if (user.isActive === false) {
            throw new common_1.ForbiddenException('Cuenta desactivada');
        }
        const roleNorm = String(user.role).trim().toLowerCase();
        if (roleNorm === 'admin') {
            return true;
        }
        for (const key of keys) {
            const ok = await this.permissionsService.userHasPermission(roleNorm, key);
            if (!ok) {
                throw new common_1.ForbiddenException('No tiene permiso para esta operación');
            }
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        permissions_service_1.PermissionsService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map