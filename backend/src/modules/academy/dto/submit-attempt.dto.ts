import { ApiProperty } from '@nestjs/swagger';
import { TestAttemptStage } from '@prisma/client';
import { IsEnum, IsObject } from 'class-validator';

export class SubmitAttemptDto {
  @ApiProperty({ enum: TestAttemptStage })
  @IsEnum(TestAttemptStage)
  stage: TestAttemptStage;

  @ApiProperty({
    description:
      'Карта ответов: id вопроса → ответ (строка или массив строк для MULTIPLE_CHOICE)',
  })
  @IsObject()
  answers: Record<string, unknown>;
}
