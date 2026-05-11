import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { LoginDto, TokenResponseDto } from './dto/auth.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private resetRepository: Repository<PasswordResetToken>,
    private auditService: AuditService,
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
    const payload = { email: user.email, sub: user.id };
    await this.auditService.log('user_login', { entityType: 'user', entityId: user.id, userId: user.id });
    return {
      access_token: this.jwtService.sign(payload),
      token_type: 'bearer',
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'Si el correo existe, recibirá instrucciones para restablecer la contraseña' };
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
    const resetUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    return {
      message: 'Si el correo existe, recibirá instrucciones para restablecer la contraseña',
      resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl,
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
