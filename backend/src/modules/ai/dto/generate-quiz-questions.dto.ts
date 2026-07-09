import { ApiProperty } from '@nestjs/swagger';
import { TestQuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GenerateQuizQuestionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ description: 'Тема, по которой нужно сгенерировать вопросы' })
  @IsString()
  topic: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 10, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  questionCount?: number;

  @ApiProperty({
    required: false,
    description: 'базовый / средний / продвинутый',
  })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiProperty({
    required: false,
    enum: TestQuestionType,
    isArray: true,
    description: 'Желаемые типы вопросов',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TestQuestionType, { each: true })
  questionTypes?: TestQuestionType[];

  @ApiProperty({
    required: false,
    description: 'Материал-источник (вложение Академии)',
  })
  @IsOptional()
  @IsString()
  materialAttachmentId?: string;
}
