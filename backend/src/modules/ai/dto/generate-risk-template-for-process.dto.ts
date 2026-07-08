import { ApiProperty } from '@nestjs/swagger';
import { RiskTemplateDirection } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GenerateRiskTemplateForProcessDto {
  @ApiProperty()
  @IsString()
  processDescription: string;

  @ApiProperty({ enum: RiskTemplateDirection, required: false })
  @IsOptional()
  @IsEnum(RiskTemplateDirection)
  direction?: RiskTemplateDirection;
}
