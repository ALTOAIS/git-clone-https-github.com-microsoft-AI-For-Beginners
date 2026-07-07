import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateCourseOutlineDto {
  @ApiProperty()
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Тема курса' })
  @IsString()
  topic: string;

  @ApiProperty({ required: false, description: 'Целевая аудитория курса' })
  @IsOptional()
  @IsString()
  audienceHint?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 6, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  moduleCount?: number;
}
