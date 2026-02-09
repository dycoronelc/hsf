import { IsNumber, IsString, IsOptional, Min, Max, IsInt } from 'class-validator';

export class CreateSurveyDto {
  @IsOptional()
  @IsNumber()
  ticketId?: number;

  @IsOptional()
  @IsNumber()
  appointmentId?: number;

  @IsOptional()
  @IsNumber()
  patientId?: number;
}

export class SubmitSurveyDto {
  @IsInt()
  @Min(0)
  @Max(10)
  npsScore: number; // Net Promoter Score: 0-10

  @IsInt()
  @Min(1)
  @Max(5)
  csatScore: number; // Customer Satisfaction: 1-5

  @IsOptional()
  @IsString()
  comments?: string;
}
