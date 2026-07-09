import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateMemoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ description: 'Тема памятки' })
  @IsString()
  topic: string;

  @ApiProperty({ required: false, description: 'Целевая аудитория' })
  @IsOptional()
  @IsString()
  audienceHint?: string;

  @ApiProperty({
    required: false,
    description: 'Материал-источник (вложение Академии)',
  })
  @IsOptional()
  @IsString()
  materialAttachmentId?: string;
}
