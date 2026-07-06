import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SuggestControlsDto {
  @ApiProperty()
  @IsString()
  analysisId: string;

  @ApiProperty()
  @IsString()
  riskId: string;
}
