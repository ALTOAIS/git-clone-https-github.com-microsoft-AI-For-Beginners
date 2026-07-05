import { ApiProperty } from '@nestjs/swagger';
import { AnalysisStage } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangeStageDto {
  @ApiProperty({ enum: AnalysisStage })
  @IsEnum(AnalysisStage)
  stage: AnalysisStage;
}
