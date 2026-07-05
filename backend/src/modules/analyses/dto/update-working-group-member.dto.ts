import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateWorkingGroupMemberDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  functions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsibilityArea?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tasks?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
