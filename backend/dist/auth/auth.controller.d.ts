import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto, LoginDto, UserResponseDto, TokenResponseDto } from './dto/auth.dto';
import { AgentState } from '../common/enums';
export declare class AuthController {
    private authService;
    private usersService;
    constructor(authService: AuthService, usersService: UsersService);
    register(createUserDto: CreateUserDto): Promise<UserResponseDto>;
    login(loginDto: LoginDto): Promise<TokenResponseDto>;
    getProfile(req: any): Promise<UserResponseDto>;
    updateAgentState(req: any, agentState: AgentState | null): Promise<{
        agentState: AgentState;
    }>;
}
