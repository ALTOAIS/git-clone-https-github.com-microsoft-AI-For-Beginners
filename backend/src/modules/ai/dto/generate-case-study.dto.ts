import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateCaseStudyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ description: 'Тема кейса' })
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
