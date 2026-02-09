import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { PreadmissionStatus } from '../../common/enums';

export class CreatePreadmissionDto {
  @IsEnum(['RAD', 'LAB'])
  departamento: string;

  @IsString()
  name1: string;

  @IsOptional()
  @IsString()
  name2?: string;

  @IsString()
  apellido1: string;

  @IsOptional()
  @IsString()
  apellido2?: string;

  @IsEnum(['C', 'P'])
  pasaporte: string;

  @IsString()
  cedula: string;

  @IsEnum(['M', 'F'])
  sexo: string;

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

  @IsString()
  provincia1: string;

  @IsString()
  distrito1: string;

  @IsString()
  corregimiento1: string;

  @IsString()
  direccion1: string;

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
  numerocotizacion?: string;

  @IsString()
  cedulaimagen: string; // Base64

  @IsString()
  ordenimagen: string; // Base64

  @IsOptional()
  @IsString()
  preautorizacion?: string; // Base64

  @IsOptional()
  @IsString()
  carnetseguro?: string; // Base64

  @IsOptional()
  @IsString()
  ssimagen?: string; // Base64
}

export class ReviewPreadmissionDto {
  @IsEnum(PreadmissionStatus)
  status: PreadmissionStatus;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
