import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums';
import {
  IsBirthDateDdMmYyyy,
  IsDocumentIdInput,
  IsPersonName,
} from '../../common/validators/person-field.validators';

const PASSWORD_RULE =
  /^(?=.*[A-Z])(?=.*[a-z0-9])[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/;

export class CreateUserDto {
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

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDocumentIdInput()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsBirthDateDdMmYyyy(true)
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

/** Registro público: no admite campo `role` (siempre se crea como paciente). */
export class RegisterPublicUserDto {
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

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDocumentIdInput()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsBirthDateDdMmYyyy(true)
  @IsString()
  birthDate?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_RULE, {
    message: 'La contraseña debe ser alfanumérica e incluir al menos una mayúscula',
  })
  password: string;
}

export class UserResponseDto {
  id: number;
  email: string;
  fullName?: string;
  role: UserRole;
  isActive: boolean;
}

export class TokenResponseDto {
  access_token: string;
  token_type: string;
}
