import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateModuleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;
}
