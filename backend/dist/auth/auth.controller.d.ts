import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto, LoginDto, UserResponseDto, TokenResponseDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { AgentState } from '../common/enums';
import { AuditService } from '../audit/audit.service';
export declare class AuthController {
    private authService;
    private usersService;
    private auditService;
    constructor(authService: AuthService, usersService: UsersService, auditService: AuditService);
    register(createUserDto: CreateUserDto): Promise<UserResponseDto>;
    login(loginDto: LoginDto): Promise<TokenResponseDto>;
    forgotPassword(body: ForgotPasswordDto): Promise<{
        message: string;
        resetUrl?: undefined;
    } | {
        message: string;
        resetUrl: string;
    }>;
    resetPassword(body: ResetPasswordDto): Promise<{
        message: string;
    }>;
    getProfile(req: any): Promise<UserResponseDto>;
    updateAgentState(req: any, agentState: AgentState | null): Promise<{
        agentState: AgentState;
    }>;
}
