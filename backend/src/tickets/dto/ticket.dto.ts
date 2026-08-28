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
    'Laboratorio',
    'Radiología',
  ])
  windowNumber: string;
}

export class CheckInByCodeDto {
  @IsString()
  code: string;
}

export class TransferTicketDto {
  /** RAD/LAB/BOTH (estudios) o ADM/URG (post-triage hacia ventanilla de admisión/urgencias). */
  @IsIn(['RAD', 'LAB', 'BOTH', 'ADM', 'URG'])
  targetArea: 'RAD' | 'LAB' | 'BOTH' | 'ADM' | 'URG';
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
