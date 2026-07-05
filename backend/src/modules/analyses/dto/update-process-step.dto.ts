import { ApiProperty } from '@nestjs/swagger';
import { ProcessControlPointType } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateProcessStepDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  executorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inputDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  outputDescription?: string;

  @ApiProperty({
    enum: ProcessControlPointType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ProcessControlPointType, { each: true })
  controlPoints?: ProcessControlPointType[];
}
