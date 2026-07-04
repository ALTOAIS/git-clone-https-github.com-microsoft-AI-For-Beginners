import { ApiProperty } from '@nestjs/swagger';
import { RiskStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ChangeStatusDto {
  @ApiProperty({ enum: RiskStatus })
  @IsEnum(RiskStatus)
  status: RiskStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
