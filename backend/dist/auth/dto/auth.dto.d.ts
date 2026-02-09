import { UserRole } from '../../common/enums';
export declare class CreateUserDto {
    email: string;
    password: string;
    fullName?: string;
    role?: UserRole;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class UserResponseDto {
    id: number;
    email: string;
    fullName?: string;
    role: UserRole;
    isActive: boolean;
}
export declare class TokenResponseDto {
    access_token: string;
    token_type: string;
}
