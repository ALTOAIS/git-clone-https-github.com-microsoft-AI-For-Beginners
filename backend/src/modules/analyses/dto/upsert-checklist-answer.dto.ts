import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpsertChecklistAnswerDto {
  @ApiProperty({
    required: false,
    description:
      'Смысл зависит от вопроса — для навигатора: VERIFIED/NOT_APPLICABLE/NEEDS_REVISION, для источников информации: REQUESTED/RECEIVED/NOT_APPLICABLE',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsibleDepartmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isReliable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedDocumentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedFactorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedRiskId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedRecommendationId?: string;
}
