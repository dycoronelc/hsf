import { IsOptional, IsEnum, IsString, IsNumber } from 'class-validator';
import { TicketStatus, Priority } from '../../common/enums';

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
}

export class CallTicketDto {
  @IsString()
  windowNumber: string;
}

export class CheckInByCodeDto {
  @IsString()
  code: string;
}
