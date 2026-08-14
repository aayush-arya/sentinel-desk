import { PartialType } from '@nestjs/swagger';
import { CreateBusinessHoursDto } from './create-business-hours.dto';

export class UpdateBusinessHoursDto extends PartialType(
  CreateBusinessHoursDto,
) {}
