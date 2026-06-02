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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const users_service_1 = require("../users/users.service");
const password_reset_token_entity_1 = require("./entities/password-reset-token.entity");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
let AuthService = class AuthService {
    constructor(usersService, jwtService, resetRepository, auditService, notificationsService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.resetRepository = resetRepository;
        this.auditService = auditService;
        this.notificationsService = notificationsService;
    }
    async validateUser(email, password) {
        const user = await this.usersService.findByEmail(email);
        if (user && (await bcrypt.compare(password, user.hashedPassword))) {
            const { hashedPassword, ...result } = user;
            return result;
        }
        return null;
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales incorrectas');
        }
        const payload = { email: user.email, sub: user.id };
        await this.auditService.log('user_login', { entityType: 'user', entityId: user.id, userId: user.id });
        return {
            access_token: this.jwtService.sign(payload),
            token_type: 'bearer',
        };
    }
    async requestPasswordReset(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return { message: 'Si el correo existe, recibirá instrucciones para restablecer la contraseña' };
        }
        const token = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.resetRepository.save(this.resetRepository.create({
            userId: user.id,
            token,
            expiresAt,
            used: false,
        }));
        const resetUrl = `${process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        this.notificationsService
            .sendPasswordResetEmail(user.email, resetUrl)
            .catch((err) => {
            console.error('Error sending password reset email:', err);
        });
        return {
            message: 'Si el correo existe, recibirá instrucciones para restablecer la contraseña',
            resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl,
        };
    }
    async resetPassword(token, password) {
        const row = await this.resetRepository.findOne({ where: { token, used: false } });
        if (!row || row.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Enlace de recuperación inválido o expirado');
        }
        await this.usersService.updatePassword(row.userId, password);
        row.used = true;
        await this.resetRepository.save(row);
        await this.auditService.log('password_reset', {
            entityType: 'user',
            entityId: row.userId,
            userId: row.userId,
        });
        return { message: 'Contraseña actualizada correctamente' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        typeorm_2.Repository,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map