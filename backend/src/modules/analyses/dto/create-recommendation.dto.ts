import { ApiProperty } from '@nestjs/swagger';
import { RecommendationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateRecommendationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  riskId?: string;

  @ApiProperty({ enum: RecommendationType })
  @IsEnum(RecommendationType)
  type: RecommendationType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsibleId?: string;
}
