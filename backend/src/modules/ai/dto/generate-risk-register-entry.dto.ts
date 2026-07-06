import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GenerateRiskRegisterEntryDto {
  @ApiProperty()
  @IsString()
  analysisId: string;

  @ApiProperty()
  @IsString()
  analysisRiskId: string;
}
