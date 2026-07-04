import { ApiProperty } from '@nestjs/swagger';
import { ActionStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateActionDto {
  @ApiProperty()
  @IsString()
  riskId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({ enum: ActionStatus, required: false })
  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  evidence?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  residualRiskImpact?: string;
}
