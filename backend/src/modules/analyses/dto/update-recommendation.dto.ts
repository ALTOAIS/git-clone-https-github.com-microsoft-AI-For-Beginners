import { ApiProperty } from '@nestjs/swagger';
import { RecommendationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRecommendationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  riskId?: string;

  @ApiProperty({ enum: RecommendationType, required: false })
  @IsOptional()
  @IsEnum(RecommendationType)
  type?: RecommendationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsibleId?: string;
}
