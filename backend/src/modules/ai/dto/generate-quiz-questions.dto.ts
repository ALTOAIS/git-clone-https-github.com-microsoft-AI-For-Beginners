import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateQuizQuestionsDto {
  @ApiProperty()
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Тема, по которой нужно сгенерировать вопросы' })
  @IsString()
  topic: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 10, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  questionCount?: number;
}
