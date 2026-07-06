import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  text: string;
}
