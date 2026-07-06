import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty()
  @IsInt()
  order: number;

  @ApiProperty()
  @IsString()
  title: string;
}
