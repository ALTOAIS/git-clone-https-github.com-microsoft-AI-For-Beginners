import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GenerateCourseOutlineDto {
  @ApiProperty({
    required: false,
    description:
      'Существующий курс (для контекстной кнопки в редакторе); в ИИ-конструкторе курс ещё не создан',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ description: 'Тема курса' })
  @IsString()
  topic: string;

  @ApiProperty({ required: false, description: 'Целевая аудитория курса' })
  @IsOptional()
  @IsString()
  audienceHint?: string;

  @ApiProperty({ required: false, minimum: 0, maximum: 6, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  moduleCount?: number;

  @ApiProperty({
    required: false,
    description: 'базовый / средний / продвинутый',
  })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({
    required: false,
    description: 'Ориентировочная длительность, часов',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  durationHours?: number;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Цели обучения',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiProperty({
    required: false,
    description:
      'Материал-источник (вложение Академии), из которого извлекается текст',
  })
  @IsOptional()
  @IsString()
  materialAttachmentId?: string;
}
