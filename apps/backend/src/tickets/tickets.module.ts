import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  controllers: [TicketsController, TagsController],
  providers: [TicketsService, TagsService],
  exports: [TicketsService],
})
export class TicketsModule {}
