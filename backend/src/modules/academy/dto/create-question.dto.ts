import { ApiProperty } from '@nestjs/swagger';
import { TestQuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TestQuestionOptionDto {
  @ApiProperty()
  @IsInt()
  order: number;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class CreateQuestionDto {
  @ApiProperty()
  @IsInt()
  order: number;

  @ApiProperty({ enum: TestQuestionType })
  @IsEnum(TestQuestionType)
  type: TestQuestionType;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  points?: number;

  @ApiProperty({
    required: false,
    description: 'Эталонный ответ — для SHORT_ANSWER',
  })
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
