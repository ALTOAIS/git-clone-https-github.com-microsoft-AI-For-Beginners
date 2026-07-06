import { ApiProperty } from '@nestjs/swagger';
import { TrainingPlanStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateTrainingPlanDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ enum: TrainingPlanStatus, required: false })
  @IsOptional()
  @IsEnum(TrainingPlanStatus)
  status?: TrainingPlanStatus;
}
