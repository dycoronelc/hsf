import { IsOptional, IsEnum, IsString, IsNumber, IsIn } from 'class-validator';
import { TicketStatus, Priority, TriageColor } from '../../common/enums';

export class CreateTicketDto {
  @IsNumber()
  serviceId: number;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  windowNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(TriageColor)
  triageColor?: TriageColor | null;
}

export class CallTicketDto {
  @IsString()
  @IsIn([
    'Ventanilla 1',
    'Ventanilla 2',
    'Ventanilla 3',
    'Ventanilla 4',
    'Ventanilla 5',
    'Triage',
    'Toma de muestra',
    'Laboratorio', // legado (tickets/ventanillas anteriores)
    'Radiología',
  ])
  windowNumber: string;
}

export class CheckInByCodeDto {
  @IsString()
  code: string;
}

export class TransferTicketDto {
  /**
   * RAD/LAB/BOTH (estudios) o ADM/URG (post-triage).
   * BOTH = secuencia Lab→Rad (un solo ticket) si SEQUENTIAL_LAB_RAD_TRANSFER;
   * con el flag en false vuelve a clonar (rollback).
   */
  @IsIn(['RAD', 'LAB', 'BOTH', 'ADM', 'URG'])
  targetArea: 'RAD' | 'LAB' | 'BOTH' | 'ADM' | 'URG';

  /** Destino actual del agente (para validar propiedad del turno en atención). */
  @IsOptional()
  @IsString()
  windowNumber?: string;
}

export class NoShowTicketDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  windowNumber?: string;
}

export class OptionalWindowDto {
  @IsOptional()
  @IsString()
  windowNumber?: string;
}

export class SetTriageColorDto {
  @IsEnum(TriageColor)
  triageColor: TriageColor;
}

export class ReleaseDestinationDto {
  @IsString()
  @IsIn([
    'Ventanilla 1',
    'Ventanilla 2',
    'Ventanilla 3',
    'Ventanilla 4',
    'Ventanilla 5',
    'Triage',
    'Toma de muestra',
    'Laboratorio', // legado
    'Radiología',
  ])
  windowNumber: string;
}
