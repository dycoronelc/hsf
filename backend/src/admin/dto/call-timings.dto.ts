import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateCallTimingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  recallWaitSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  noShowWaitSeconds?: number;
}
