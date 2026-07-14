import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(120)
  dailyGoalMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTopics?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLearningMethods?: string[];

  @IsOptional()
  @IsObject()
  selfAssessment?: Record<string, number>;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  reminderTime?: string;

  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsIn(['ru', 'kk', 'en'])
  interfaceLanguage?: string;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}
