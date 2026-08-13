import { PartialType } from '@nestjs/swagger';
import { CreateMacroDto } from './create-macro.dto';

export class UpdateMacroDto extends PartialType(CreateMacroDto) {}
