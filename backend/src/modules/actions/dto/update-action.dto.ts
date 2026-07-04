import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateActionDto } from './create-action.dto';

export class UpdateActionDto extends PartialType(OmitType(CreateActionDto, ['riskId'] as const)) {}
