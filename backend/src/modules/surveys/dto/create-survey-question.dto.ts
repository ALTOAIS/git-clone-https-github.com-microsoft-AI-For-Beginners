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

export class SurveyQuestionOptionDto {
  @ApiProperty()
  @IsInt()
  order: number;

  @ApiProperty()
  @IsString()
  text: string;
}

export class CreateSurveyQuestionDto {
  @ApiProperty()
  @IsInt()
  order: number;

  @ApiProperty({ enum: SurveyQuestionType })
  @IsEnum(SurveyQuestionType)
  type: SurveyQuestionType;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty({ type: [SurveyQuestionOptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionOptionDto)
  options?: SurveyQuestionOptionDto[];
}
