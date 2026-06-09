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
var AuthService_1;
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
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService, resetRepository, auditService, notificationsService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.resetRepository = resetRepository;
        this.auditService = auditService;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(AuthService_1.name);
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
        const normalized = email.trim().toLowerCase();
        const user = await this.usersService.findByEmail(normalized);
        const genericMessage = 'Si el correo está registrado como usuario de la plataforma, recibirá instrucciones para restablecer la contraseña. Revise también la carpeta de spam.';
        if (!user) {
            return {
                message: genericMessage,
                debugHint: process.env.NODE_ENV !== 'production'
                    ? 'No hay una cuenta de usuario registrada con ese correo. Debe crear cuenta en Registrarse o usar un correo de prueba del sistema.'
                    : undefined,
            };
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
        try {
            await this.notificationsService.sendPasswordResetEmail(user.email, resetUrl);
        }
        catch (err) {
            this.logger.error(`No se pudo enviar correo de recuperación a ${user.email}`, err);
            if ((0, notifications_service_1.isSmtpDeliveryEnabled)()) {
                throw new common_1.BadRequestException('No se pudo enviar el correo de recuperación. Intente más tarde o contacte al hospital.');
            }
        }
        const isDev = process.env.NODE_ENV !== 'production';
        return {
            message: (0, notifications_service_1.isSmtpDeliveryEnabled)()
                ? genericMessage
                : `${genericMessage} En desarrollo el correo no se envía por SMTP; use el enlace de prueba que aparece abajo.`,
            resetUrl: isDev ? resetUrl : undefined,
            emailSent: (0, notifications_service_1.isSmtpDeliveryEnabled)(),
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
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        typeorm_2.Repository,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map