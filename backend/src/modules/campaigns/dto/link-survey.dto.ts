import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LinkSurveyDto {
  @ApiProperty()
  @IsString()
  surveyId: string;
}
