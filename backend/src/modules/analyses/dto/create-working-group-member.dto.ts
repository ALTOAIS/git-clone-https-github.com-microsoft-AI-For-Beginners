import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateWorkingGroupMemberDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  role: string;

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
}
