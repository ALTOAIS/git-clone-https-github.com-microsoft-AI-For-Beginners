import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AnalyzeRiskDto {
  @ApiProperty()
  @IsString()
  analysisId: string;

  @ApiProperty()
  @IsString()
  processStepId: string;
}
