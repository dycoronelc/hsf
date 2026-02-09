import { IsNumber, IsDateString, IsString, IsOptional, IsEnum } from 'class-validator';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateAppointmentDto {
  @IsNumber()
  serviceId: number;

  @IsDateString()
  scheduledDate: string; // YYYY-MM-DD

  @IsString()
  scheduledTime: string; // HH:MM

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckAvailabilityDto {
  @IsNumber()
  serviceId: number;

  @IsDateString()
  date: string; // YYYY-MM-DD
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
