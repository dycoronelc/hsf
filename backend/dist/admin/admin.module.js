"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const permissions_module_1 = require("../permissions/permissions.module");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const service_entity_1 = require("../services/entities/service.entity");
const role_permission_entity_1 = require("./entities/role-permission.entity");
const admin_role_matrix_row_entity_1 = require("./entities/admin-role-matrix-row.entity");
const user_entity_1 = require("../users/entities/user.entity");
const ticket_entity_1 = require("../tickets/entities/ticket.entity");
const notification_entity_1 = require("../notifications/entities/notification.entity");
const password_reset_token_entity_1 = require("../auth/entities/password-reset-token.entity");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            permissions_module_1.PermissionsModule,
            typeorm_1.TypeOrmModule.forFeature([
                service_entity_1.Service,
                role_permission_entity_1.RolePermission,
                admin_role_matrix_row_entity_1.AdminRoleMatrixRow,
                user_entity_1.User,
                ticket_entity_1.Ticket,
                notification_entity_1.Notification,
                password_reset_token_entity_1.PasswordResetToken,
            ]),
        ],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_service_1.AdminService],
        exports: [admin_service_1.AdminService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map