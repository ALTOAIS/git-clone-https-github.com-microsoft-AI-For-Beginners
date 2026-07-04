import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRiskDto } from './create-risk.dto';

export class UpdateRiskDto extends PartialType(
  OmitType(CreateRiskDto, ['sourceIds'] as const),
) {}
