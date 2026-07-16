import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MICRO_CATEGORIES } from '../ai/ai.types';

export class GenerateMicroLessonDto {
  @IsIn(MICRO_CATEGORIES)
  category: string;
}

class MicroLessonAnswerDto {
  @IsString()
  @MaxLength(50)
  exerciseId: string;

  @IsString()
  @MaxLength(500)
  answer: string;
}

export class CompleteMicroLessonDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MicroLessonAnswerDto)
  answers: MicroLessonAnswerDto[];
}
