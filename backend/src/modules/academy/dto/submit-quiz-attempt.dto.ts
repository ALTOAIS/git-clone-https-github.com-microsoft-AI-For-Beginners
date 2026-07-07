import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SubmitQuizAttemptDto {
  @ApiProperty({
    description:
      'Карта ответов: id вопроса → ответ (строка или массив строк для MULTIPLE_CHOICE)',
  })
  @IsObject()
  answers: Record<string, unknown>;
}
