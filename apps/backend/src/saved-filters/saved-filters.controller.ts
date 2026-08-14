import {
  Controller,
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SavedFiltersService } from './saved-filters.service';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('saved-filters')
@Controller('saved-filters')
export class SavedFiltersController {
  constructor(private readonly savedFilters: SavedFiltersService) {}

  @Get()
  @ApiOperation({
    summary: "List the current user's saved ticket filter views",
  })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.savedFilters.findAll(user);
  }

  @RequireCsrf()
  @Post()
  @ApiOperation({ summary: 'Save (or overwrite) a named filter view' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSavedFilterDto,
  ) {
    return this.savedFilters.create(user, dto);
  }

  @RequireCsrf()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved filter view' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.savedFilters.remove(user, id);
  }
}
