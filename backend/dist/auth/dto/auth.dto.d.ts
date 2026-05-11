import { UserRole } from '../../common/enums';
export declare class CreateUserDto {
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
    nationalId?: string;
    birthDate?: string;
    role?: UserRole;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
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
