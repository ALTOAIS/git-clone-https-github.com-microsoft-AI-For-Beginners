import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LinkCourseDto {
  @ApiProperty()
  @IsString()
  courseId: string;
}
