import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contextEntityType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contextEntityId?: string;
}
