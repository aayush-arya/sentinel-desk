import { Module } from '@nestjs/common';
import { MacrosController } from './macros.controller';
import { MacrosService } from './macros.service';

@Module({
  controllers: [MacrosController],
  providers: [MacrosService],
})
export class MacrosModule {}
