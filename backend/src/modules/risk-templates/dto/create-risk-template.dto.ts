import { ApiProperty } from '@nestjs/swagger';
import { RiskTemplateDirection } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRiskTemplateDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ enum: RiskTemplateDirection })
  @IsEnum(RiskTemplateDirection)
  direction: RiskTemplateDirection;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  corruptionScheme?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  causes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  corruptionFactors?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  consequences?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  redFlags?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  typicalControls?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedActions?: string[];

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  baseProbability: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  baseImpact: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
