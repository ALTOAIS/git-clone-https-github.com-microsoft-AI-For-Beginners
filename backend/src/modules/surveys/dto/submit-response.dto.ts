import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SubmitResponseDto {
  @ApiProperty({
    description:
      'Карта ответов: id вопроса → ответ (строка, массив строк или число для RATING)',
  })
  @IsObject()
  answers: Record<string, unknown>;
}
