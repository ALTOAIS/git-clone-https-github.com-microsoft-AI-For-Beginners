import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateReassessmentDto {
  @ApiProperty()
  @IsString()
  reassessmentNotes: string;
}
