import { ApiProperty } from '@nestjs/swagger';
import { TrainingPlanStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTrainingPlanDto {
  @ApiProperty({ minimum: 2000, maximum: 2100 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: TrainingPlanStatus, required: false })
  @IsOptional()
  @IsEnum(TrainingPlanStatus)
  status?: TrainingPlanStatus;
}
