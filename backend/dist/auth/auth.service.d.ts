import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { LoginDto, TokenResponseDto } from './dto/auth.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    private resetRepository;
    private auditService;
    private notificationsService;
    constructor(usersService: UsersService, jwtService: JwtService, resetRepository: Repository<PasswordResetToken>, auditService: AuditService, notificationsService: NotificationsService);
    validateUser(email: string, password: string): Promise<any>;
    login(loginDto: LoginDto): Promise<TokenResponseDto>;
    requestPasswordReset(email: string): Promise<{
        message: string;
        resetUrl?: undefined;
    } | {
        message: string;
        resetUrl: string;
    }>;
    resetPassword(token: string, password: string): Promise<{
        message: string;
    }>;
}
