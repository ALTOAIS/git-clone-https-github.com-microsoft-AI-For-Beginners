import { ApiProperty } from '@nestjs/swagger';
import { CorruptogenicFactorType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateFactorDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  processStepId?: string;

  @ApiProperty({ enum: CorruptogenicFactorType })
  @IsEnum(CorruptogenicFactorType)
  factorType: CorruptogenicFactorType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
