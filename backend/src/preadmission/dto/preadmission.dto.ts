import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  ValidateIf,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { PreadmissionStatus } from '../../common/enums';
import {
  IsBirthDateDdMmYyyy,
  IsDocumentIdInput,
  IsPersonName,
  IsProbableAttentionDateDdMmYyyy,
} from '../../common/validators/person-field.validators';

export class CreatePreadmissionDto {
  @IsEnum(['RAD', 'LAB'])
  departamento: string;

  @IsEnum(['paciente', 'acompanante'])
  registradoComo: string;

  @IsPersonName()
  @IsString()
  name1: string;

  @IsOptional()
  @IsPersonName(true)
  @IsString()
  name2?: string;

  @IsPersonName()
  @IsString()
  apellido1: string;

  @IsOptional()
  @IsPersonName(true)
  @IsString()
  apellido2?: string;

  @IsEnum(['C', 'P'])
  pasaporte: string;

  @IsDocumentIdInput()
  @IsString()
  cedula: string;

  @IsEnum(['M', 'F'])
  sexo: string;

  @IsBirthDateDdMmYyyy()
  @IsString()
  fechanac: string; // DD/MM/YYYY

  @IsString()
  nacionalidad: string;

  @IsString()
  estadocivil: string;

  @IsString()
  tiposangre: string;

  @IsEmail()
  email: string;

  @IsString()
  celular: string;

  @IsOptional()
  @IsString()
  celularPrefix?: string;

  @IsString()
  provincia1: string;

  @IsString()
  distrito1: string;

  @IsString()
  corregimiento1: string;

  @MaxLength(200)
  @IsString()
  direccion1: string;

  @IsPersonName()
  @IsString()
  encasourgencia: string;

  @IsString()
  relacion: string;

  @IsEmail()
  email3: string;

  @IsString()
  celular3: string;

  @IsOptional()
  @IsString()
  provincia3?: string;

  @IsOptional()
  @IsString()
  distrito3?: string;

  @IsOptional()
  @IsString()
  corregimiento3?: string;

  @IsOptional()
  @IsString()
  direccion3?: string;

  @IsOptional()
  @IsProbableAttentionDateDdMmYyyy(true)
  @IsString()
  fechaprobableatencion?: string;

  @IsOptional()
  @IsString()
  medico?: string;

  @IsEnum(['SI', 'NO'])
  doblecobertura: string;

  @ValidateIf((o) => o.doblecobertura === 'SI')
  @IsNotEmpty()
  @IsString()
  compania1?: string;

  @ValidateIf((o) => o.doblecobertura === 'SI')
  @IsNotEmpty()
  @IsString()
  poliza1?: string;

  @IsOptional()
  @IsString()
  diagnostico?: string;

  @IsOptional()
  @IsString()
  procedimientoEstudio?: string;

  @IsOptional()
  @IsString()
  numerocotizacion?: string;
}

/** Campos de formulario enviados como JSON en multipart (campo `data`). */
export type CreatePreadmissionBodyDto = CreatePreadmissionDto;

export class ParseCedulaQrDto {
  @IsString()
  raw: string;
}

export class RequestVerificationDto {
  @IsEmail()
  destination: string;
}

export class ConfirmVerificationDto {
  @IsEmail()
  destination: string;

  @IsString()
  code: string;
}

export class ReviewPreadmissionDto {
  @IsEnum(PreadmissionStatus)
  status: PreadmissionStatus;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
