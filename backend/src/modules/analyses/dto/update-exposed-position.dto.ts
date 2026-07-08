import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateExposedPositionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  positionTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  authorities?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedRiskId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  riskLevel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recommendedControls?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  trainingNeeded?: boolean;
}
