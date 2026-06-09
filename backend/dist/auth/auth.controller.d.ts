import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto, UserResponseDto, TokenResponseDto, ForgotPasswordDto, ResetPasswordDto, RegisterPublicUserDto } from './dto/auth.dto';
import { AgentState } from '../common/enums';
import { AuditService } from '../audit/audit.service';
export declare class AuthController {
    private authService;
    private usersService;
    private auditService;
    constructor(authService: AuthService, usersService: UsersService, auditService: AuditService);
    register(body: RegisterPublicUserDto): Promise<UserResponseDto>;
    login(loginDto: LoginDto): Promise<TokenResponseDto>;
    forgotPassword(body: ForgotPasswordDto): Promise<{
        message: string;
        debugHint: string;
        resetUrl?: undefined;
        emailSent?: undefined;
    } | {
        message: string;
        resetUrl: string;
        emailSent: boolean;
        debugHint?: undefined;
    }>;
    resetPassword(body: ResetPasswordDto): Promise<{
        message: string;
    }>;
    getProfile(req: any): Promise<UserResponseDto>;
    updateAgentState(req: any, agentState: AgentState | null): Promise<{
        agentState: AgentState;
    }>;
}
