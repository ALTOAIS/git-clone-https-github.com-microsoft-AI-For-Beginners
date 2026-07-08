import { ApiProperty } from '@nestjs/swagger';
import { RiskTemplateDirection } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryRiskTemplatesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ enum: RiskTemplateDirection, required: false })
  @IsOptional()
  @IsEnum(RiskTemplateDirection)
  direction?: RiskTemplateDirection;

  @ApiProperty({ required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Comma-separated tag list, matches templates containing ANY of the given tags. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ required: false, description: 'Включить деактивированные шаблоны' })
  @IsOptional()
  @Type(() => Boolean)
  includeInactive?: boolean;
}
