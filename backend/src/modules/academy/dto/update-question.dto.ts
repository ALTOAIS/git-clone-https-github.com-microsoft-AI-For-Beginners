import { ApiProperty } from '@nestjs/swagger';
import { TestQuestionType } from '@prisma/client';
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
import { TestQuestionOptionDto } from './create-question.dto';

export class UpdateQuestionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ enum: TestQuestionType, required: false })
  @IsOptional()
  @IsEnum(TestQuestionType)
  type?: TestQuestionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  points?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  correctAnswerText?: string;

  @ApiProperty({ type: [TestQuestionOptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => TestQuestionOptionDto)
  options?: TestQuestionOptionDto[];
}
