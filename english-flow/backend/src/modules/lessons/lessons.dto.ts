import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateLessonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  topic: string;

  @IsOptional()
  @IsIn(['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'C1'])
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  phraseCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  focusSkill?: string;

  @IsOptional()
  @IsIn(['professional', 'everyday'])
  context?: string;

  @IsOptional()
  @IsString()
  materialId?: string;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  objective?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['DRAFT', 'READY', 'ARCHIVED'])
  status?: string;
}

export class FinishAttemptDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  speakingSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  errorsCount?: number;

  @IsOptional()
  @IsObject()
  resultJson?: Record<string, unknown>;
}

export class EvaluateSentenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  sentence: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  targetPhrase: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;
}
