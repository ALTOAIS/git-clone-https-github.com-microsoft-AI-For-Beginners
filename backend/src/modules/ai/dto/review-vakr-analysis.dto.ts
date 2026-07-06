import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReviewVakrAnalysisDto {
  @ApiProperty()
  @IsString()
  analysisId: string;
}
