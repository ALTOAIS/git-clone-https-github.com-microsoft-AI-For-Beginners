import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePhraseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  english: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  russian: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @IsOptional()
  @IsIn(['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'C1'])
  cefrLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  example?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  hint?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn([
    'SEED',
    'AI_LESSON',
    'MANUAL',
    'SPEAKING',
    'UPLOADED_DOCUMENT',
    'ERROR_CORRECTION',
    'DIAGNOSTIC',
  ])
  source?: string;
}

export class BulkCreatePhrasesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePhraseDto)
  phrases: CreatePhraseDto[];
}

export class UpdateUserPhraseDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  personalExample?: string;

  @IsOptional()
  @IsIn(['NEW', 'LEARNING', 'MASTERED', 'DIFFICULT'])
  status?: string;
}

export class EvaluateTranslationDto {
  @IsIn(['ru_en', 'en_ru'])
  direction: 'ru_en' | 'en_ru';

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prompt: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  expected: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptable?: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  userAnswer: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;
}

export class ReviewAttemptDto {
  @IsString()
  @IsNotEmpty()
  phraseId: string;

  @IsIn(['recognition', 'translation', 'sentence', 'voice'])
  taskType: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  answer?: string;

  @IsIn([true, false])
  correct: boolean;

  @IsInt()
  @Min(0)
  @Max(3)
  confidence: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  responseTimeMs?: number;
}
