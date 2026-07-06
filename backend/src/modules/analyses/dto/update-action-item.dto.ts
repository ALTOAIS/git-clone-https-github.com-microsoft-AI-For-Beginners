import { ApiProperty } from '@nestjs/swagger';
import { ActionPriority, ActionStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateActionItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recommendationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  task?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expectedResult?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsibleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({ enum: ActionPriority, required: false })
  @IsOptional()
  @IsEnum(ActionPriority)
  priority?: ActionPriority;

  @ApiProperty({ enum: ActionStatus, required: false })
  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supportingDocs?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comments?: string;
}
