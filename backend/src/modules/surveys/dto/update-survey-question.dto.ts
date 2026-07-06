import { ApiProperty } from '@nestjs/swagger';
import { SurveyQuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SurveyQuestionOptionDto } from './create-survey-question.dto';

export class UpdateSurveyQuestionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ enum: SurveyQuestionType, required: false })
  @IsOptional()
  @IsEnum(SurveyQuestionType)
  type?: SurveyQuestionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ type: [SurveyQuestionOptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionOptionDto)
  options?: SurveyQuestionOptionDto[];
}
