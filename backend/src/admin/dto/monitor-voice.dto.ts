import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMonitorVoiceTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  template: string;
}
