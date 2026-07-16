import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums';
import { IsPersonName } from '../../common/validators/person-field.validators';

const PASSWORD_RULE =
  /^(?=.*[A-Z])(?=.*[a-z0-9])[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/;

export class UpdateRolePermissionsDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsObject()
  permissions: Record<string, boolean>;
}

export class CreateTicketTypeDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  area: string;

  @IsOptional()
  @IsString()
  ticketPrefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  priorityLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedTime?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTicketTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  ticketPrefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  priorityLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedTime?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStaffUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsPersonName(true)
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsBoolean()
  sessionNeverExpires?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(525600)
  sessionExpiresMinutes?: number | null;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsPersonName(true)
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nationalId?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{0,8}$/, {
    message: 'El celular debe contener solo dígitos (máximo 8)',
  })
  phone?: string | null;

  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateStaffUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_RULE, {
    message: 'La contraseña debe ser alfanumérica e incluir al menos una mayúscula',
  })
  password: string;

  @IsOptional()
  @IsPersonName(true)
  @IsString()
  fullName?: string;

  @IsEnum(UserRole)
  role: UserRole;
}

export class CreateMatrixRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class PatchMatrixRoleDto {
  @IsBoolean()
  isActive: boolean;
}
