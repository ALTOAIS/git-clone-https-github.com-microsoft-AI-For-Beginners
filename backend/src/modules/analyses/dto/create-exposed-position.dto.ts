import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateExposedPositionDto {
  @ApiProperty()
  @IsString()
  positionTitle: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false, description: 'Полномочия' })
  @IsOptional()
  @IsString()
  authorities?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedRiskId?: string;

  @ApiProperty({
    required: false,
    description: 'Уровень риска (LOW/MEDIUM/HIGH/CRITICAL)',
  })
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
