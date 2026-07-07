import { ApiProperty } from '@nestjs/swagger';
import { LessonContentType } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class GenerateLessonContentDto {
  @ApiProperty()
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Тема курса — для контекста генерации' })
  @IsString()
  courseTopic: string;

  @ApiProperty()
  @IsString()
  lessonTitle: string;

  @ApiProperty({ enum: LessonContentType })
  @IsEnum(LessonContentType)
  contentType: LessonContentType;
}
