import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { UserRole } from '../../common/enums';

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
}
