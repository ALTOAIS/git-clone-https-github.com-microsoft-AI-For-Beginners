import { ApiProperty } from '@nestjs/swagger';
import { LessonContentType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateLessonDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ enum: LessonContentType, required: false })
  @IsOptional()
  @IsEnum(LessonContentType)
  contentType?: LessonContentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;
}
