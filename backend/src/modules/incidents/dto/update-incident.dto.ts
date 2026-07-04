import { PartialType } from '@nestjs/swagger';
import { CreateIncidentDto } from './create-incident.dto';

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {}
