import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateCampaignMessageDto {
  @ApiProperty({ description: 'Тема рассылки/кампании' })
  @IsString()
  topic: string;

  @ApiProperty({ required: false, description: 'Название связанного курса' })
  @IsOptional()
  @IsString()
  courseTitle?: string;

  @ApiProperty({
    required: false,
    description: 'Кампания — для привязки в логе',
  })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty({
    required: false,
    description: 'Материал-источник (вложение Академии)',
  })
  @IsOptional()
  @IsString()
  materialAttachmentId?: string;
}
