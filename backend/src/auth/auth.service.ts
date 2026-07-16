import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { LoginDto, TokenResponseDto } from './dto/auth.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuditService } from '../audit/audit.service';
import {
  NotificationsService,
  isSmtpDeliveryEnabled,
} from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private resetRepository: Repository<PasswordResetToken>,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.hashedPassword))) {
      const { hashedPassword, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    await this.auditService.log('user_login', {
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
    });
    return this.issueToken(user);
  }

  async refreshSession(user: { id: number; email: string }): Promise<TokenResponseDto> {
    const full = await this.usersService.findByEmail(user.email);
    if (!full) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    await this.auditService.log('session_refreshed', {
      entityType: 'user',
      entityId: full.id,
      userId: full.id,
    });
    const { hashedPassword, ...safeUser } = full;
    return this.issueToken(safeUser);
  }

  private resolveExpiresIn(user: {
    role: string;
    sessionNeverExpires?: boolean;
    sessionExpiresMinutes?: number | null;
  }): string | number {
    if (user.sessionNeverExpires) {
      return process.env.JWT_EXPIRES_MONITOR || '3650d';
    }
    if (user.sessionExpiresMinutes != null && user.sessionExpiresMinutes > 0) {
      return `${user.sessionExpiresMinutes}m`;
    }
    const roleEnvKey = `JWT_EXPIRES_${String(user.role).toUpperCase()}`;
    const roleSpecific = process.env[roleEnvKey]?.trim();
    if (roleSpecific) return roleSpecific;
    return process.env.JWT_EXPIRES || '30m';
  }

  private issueToken(user: {
    id: number;
    email: string;
    role: string;
    sessionNeverExpires?: boolean;
    sessionExpiresMinutes?: number | null;
  }): TokenResponseDto {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: this.resolveExpiresIn(user),
      }),
      token_type: 'bearer',
    };
  }

  async requestPasswordReset(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    const genericMessage =
      'Si el correo está registrado como usuario de la plataforma, recibirá instrucciones para restablecer la contraseña. Revise también la carpeta de spam.';

    if (!user) {
      return {
        message: genericMessage,
        debugHint:
          process.env.NODE_ENV !== 'production'
            ? 'No hay una cuenta de usuario registrada con ese correo. Debe crear cuenta en Registrarse o usar un correo de prueba del sistema.'
            : undefined,
      };
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.resetRepository.save(
      this.resetRepository.create({
        userId: user.id,
        token,
        expiresAt,
        used: false,
      }),
    );
    const resetUrl = `${process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    try {
      await this.notificationsService.sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      this.logger.error(`No se pudo enviar correo de recuperación a ${user.email}`, err);
      if (isSmtpDeliveryEnabled()) {
        throw new BadRequestException(
          'No se pudo enviar el correo de recuperación. Intente más tarde o contacte al hospital.',
        );
      }
    }

    const isDev = process.env.NODE_ENV !== 'production';
    return {
      message: isSmtpDeliveryEnabled()
        ? genericMessage
        : `${genericMessage} En desarrollo el correo no se envía por SMTP; use el enlace de prueba que aparece abajo.`,
      resetUrl: isDev ? resetUrl : undefined,
      emailSent: isSmtpDeliveryEnabled(),
    };
  }

  async resetPassword(token: string, password: string) {
    const row = await this.resetRepository.findOne({ where: { token, used: false } });
    if (!row || row.expiresAt < new Date()) {
      throw new BadRequestException('Enlace de recuperación inválido o expirado');
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
}
