import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { MacrosService } from './macros.service';
import { CreateMacroDto } from './dto/create-macro.dto';
import { UpdateMacroDto } from './dto/update-macro.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

const STAFF_ROLES = [
  RoleName.AGENT,
  RoleName.SENIOR_AGENT,
  RoleName.MANAGER,
  RoleName.ADMIN,
];

@ApiTags('macros')
@Roles(...STAFF_ROLES)
@Controller('macros')
export class MacrosController {
  constructor(private readonly macros: MacrosService) {}

  @Get()
  @ApiOperation({ summary: 'List saved-reply macros for the organization' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.macros.findAll(user);
  }

  @RequireCsrf()
  @Post()
  @ApiOperation({ summary: 'Create a saved-reply macro' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMacroDto) {
    return this.macros.create(user, dto);
  }

  @RequireCsrf()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a macro' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMacroDto,
  ) {
    return this.macros.update(user, id, dto);
  }

  @RequireCsrf()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a macro' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.macros.remove(user, id);
  }
}
