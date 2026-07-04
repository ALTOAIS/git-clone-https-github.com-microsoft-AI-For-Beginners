import { ApiProperty } from '@nestjs/swagger';
import { ControlEffectiveness, ControlType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateControlDto {
  @ApiProperty()
  @IsString()
  riskId: string;

  @ApiProperty({ enum: ControlType })
  @IsEnum(ControlType)
  type: ControlType;

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

  @ApiProperty({ enum: ControlEffectiveness, required: false })
  @IsOptional()
  @IsEnum(ControlEffectiveness)
  effectiveness?: ControlEffectiveness;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  lastTestedAt?: string;
}
