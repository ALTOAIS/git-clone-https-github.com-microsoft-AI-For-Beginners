import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ImproveRiskTemplateDescriptionDto {
  @ApiProperty()
  @IsString()
  templateId: string;
}
