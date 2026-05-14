import { UserRole } from '../../common/enums';
export declare class UpdateRolePermissionsDto {
    role: UserRole;
    permissions: Record<string, boolean>;
}
export declare class CreateTicketTypeDto {
    name: string;
    code: string;
    area: string;
    ticketPrefix?: string;
    priorityLevel?: number;
    estimatedTime?: number;
    isActive?: boolean;
}
export declare class UpdateTicketTypeDto {
    name?: string;
    code?: string;
    area?: string;
    ticketPrefix?: string;
    priorityLevel?: number;
    estimatedTime?: number;
    isActive?: boolean;
}
export declare class UpdateStaffUserDto {
    role?: UserRole;
    isActive?: boolean;
    fullName?: string;
}
export declare class CreateStaffUserDto {
    email: string;
    password: string;
    fullName?: string;
    role: UserRole;
}
export declare class CreateMatrixRoleDto {
    role: UserRole;
}
export declare class PatchMatrixRoleDto {
    isActive: boolean;
}
