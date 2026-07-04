import { ApiProperty } from '@nestjs/swagger';
import { IncidentAction, IncidentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiProperty({ enum: IncidentStatus, required: false })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiProperty({ enum: IncidentAction, required: false })
  @IsOptional()
  @IsEnum(IncidentAction)
  action?: IncidentAction;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({ required: false, description: 'Existing risk to update/close/escalate' })
  @IsOptional()
  @IsString()
  riskId?: string;
}
