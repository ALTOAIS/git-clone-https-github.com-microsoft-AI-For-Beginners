import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GenerateVakrReportDto {
  @ApiProperty()
  @IsString()
  analysisId: string;
}
