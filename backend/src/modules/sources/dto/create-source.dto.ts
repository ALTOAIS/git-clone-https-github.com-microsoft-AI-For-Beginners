import { ApiProperty } from '@nestjs/swagger';
import { SourceType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSourceDto {
  @ApiProperty({ enum: SourceType })
  @IsEnum(SourceType)
  type: SourceType;

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
  referenceNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
