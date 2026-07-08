import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRiskDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessProcessId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  likelihood?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  impact?: number;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Source IDs to link on creation',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceTemplateId?: string;

  @ApiProperty({
    required: false,
    description: 'Анализ ВАКР, из которого создан этот риск',
  })
  @IsOptional()
  @IsString()
  sourceAnalysisId?: string;

  @ApiProperty({
    required: false,
    description:
      'Снимок контекста происхождения риска из ВАКР (процесс, фактор, причина, последствия и т.д.)',
  })
  @IsOptional()
  @IsObject()
  originContext?: Record<string, unknown>;
}
