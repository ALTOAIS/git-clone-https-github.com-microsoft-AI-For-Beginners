import { ApiProperty } from '@nestjs/swagger';
import { LessonContentType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty()
  @IsInt()
  order: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: LessonContentType })
  @IsEnum(LessonContentType)
  contentType: LessonContentType;

  @ApiProperty({
    required: false,
    description: 'Текст урока в формате Markdown',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    required: false,
    description: 'Ссылка на видео — для уроков типа VIDEO',
  })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiProperty({
    required: false,
    description: 'Внешняя ссылка (например, на подключение к вебинару)',
  })
  @IsOptional()
  @IsUrl()
  externalUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @ApiProperty({
    required: false,
    description: 'Дата и время проведения — для вебинаров и очных мероприятий',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
