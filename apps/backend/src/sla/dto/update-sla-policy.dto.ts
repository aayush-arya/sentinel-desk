import { PartialType } from '@nestjs/swagger';
import { CreateSlaPolicyDto } from './create-sla-policy.dto';

export class UpdateSlaPolicyDto extends PartialType(CreateSlaPolicyDto) {}
