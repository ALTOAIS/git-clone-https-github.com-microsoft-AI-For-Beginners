import { ApiProperty } from '@nestjs/swagger';
import { AnalysisScope, AnalysisStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAnalysisDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiProperty({ required: false, enum: AnalysisStatus })
  @IsOptional()
  @IsEnum(AnalysisStatus)
  status?: AnalysisStatus;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];

  @ApiProperty({
    required: false,
    description: 'На основании какого решения/приказа проводится ВАКР',
  })
  @IsOptional()
  @IsString()
  orderBasis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @ApiProperty({
    required: false,
    description: 'Кто принял решение о проведении ВАКР',
  })
  @IsOptional()
  @IsString()
  decisionMakerId?: string;

  @ApiProperty({ required: false, enum: AnalysisScope })
  @IsOptional()
  @IsEnum(AnalysisScope)
  analysisScope?: AnalysisScope;

  @ApiProperty({
    required: false,
    description: 'Кто ответственен за координацию проведения ВАКР',
  })
  @IsOptional()
  @IsString()
  coordinatorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  extensionRequested?: boolean;
}
