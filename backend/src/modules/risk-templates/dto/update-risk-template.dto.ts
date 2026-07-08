import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRiskTemplateDto } from './create-risk-template.dto';

export class UpdateRiskTemplateDto extends PartialType(CreateRiskTemplateDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
