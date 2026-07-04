import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateControlDto } from './create-control.dto';

export class UpdateControlDto extends PartialType(
  OmitType(CreateControlDto, ['riskId'] as const),
) {}
