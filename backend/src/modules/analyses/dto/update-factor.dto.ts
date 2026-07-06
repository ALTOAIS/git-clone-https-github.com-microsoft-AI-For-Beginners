import { ApiProperty } from '@nestjs/swagger';
import { CorruptogenicFactorType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateFactorDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  processStepId?: string;

  @ApiProperty({ enum: CorruptogenicFactorType, required: false })
  @IsOptional()
  @IsEnum(CorruptogenicFactorType)
  factorType?: CorruptogenicFactorType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
