import { ApiProperty } from '@nestjs/swagger';
import { SurveyStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSurveyDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiProperty({ enum: SurveyStatus, required: false })
  @IsOptional()
  @IsEnum(SurveyStatus)
  status?: SurveyStatus;
}
