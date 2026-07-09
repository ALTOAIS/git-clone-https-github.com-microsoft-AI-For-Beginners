import { ApiProperty } from '@nestjs/swagger';
import { LessonContentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateLessonContentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ description: 'Тема курса — для контекста генерации' })
  @IsString()
  courseTopic: string;

  @ApiProperty()
  @IsString()
  lessonTitle: string;

  @ApiProperty({ enum: LessonContentType })
  @IsEnum(LessonContentType)
  contentType: LessonContentType;

  @ApiProperty({ required: false, description: 'Целевая аудитория' })
  @IsOptional()
  @IsString()
  audienceHint?: string;

  @ApiProperty({ required: false, description: 'Желаемая длительность, минут' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  durationMinutes?: number;

  @ApiProperty({
    required: false,
    description: 'Материал-источник (вложение Академии)',
  })
  @IsOptional()
  @IsString()
  materialAttachmentId?: string;
}
