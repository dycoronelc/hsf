import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, RegisterPublicUserDto, UserResponseDto } from '../auth/dto/auth.dto';
import { AgentState } from '../common/enums';
export declare class UsersService {
    private usersRepository;
    constructor(usersRepository: Repository<User>);
    registerPublicPatient(dto: RegisterPublicUserDto): Promise<UserResponseDto>;
    create(createUserDto: CreateUserDto): Promise<UserResponseDto>;
    findByEmail(email: string): Promise<User | null>;
    updateAgentState(userId: number, agentState: AgentState | null): Promise<void>;
    updatePassword(userId: number, password: string): Promise<void>;
    findOne(id: number): Promise<UserResponseDto | null>;
}
