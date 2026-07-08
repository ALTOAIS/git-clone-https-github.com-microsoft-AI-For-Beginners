import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateAnalysisRiskDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  factorId?: string;

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
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cause?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conditions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  corruptionScheme?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  interestedParties?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  consequences?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  existingControls?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceTemplateId?: string;
}
