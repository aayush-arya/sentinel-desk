import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('warn', (e: unknown) => this.logger.warn(e));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('error', (e: unknown) => this.logger.error(e));
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
