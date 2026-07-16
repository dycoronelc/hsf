import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMonitorMediaDto {
  @IsString()
  kind: 'message' | 'image' | 'video';

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateMonitorMediaDto {
  @IsOptional()
  @IsString()
  kind?: 'message' | 'image' | 'video';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
