import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiEnrichmentProcessor } from './ai-enrichment.processor';
import { AnthropicAiProvider } from './providers/anthropic-ai.provider';
import { MockAiProvider } from './providers/mock-ai.provider';
import { AI_ENRICHMENT_QUEUE, AI_PROVIDER } from './ai.constants';
import { RealtimeModule } from '../realtime/realtime.module';
import { TicketsModule } from '../tickets/tickets.module';
import type { AppConfig } from '../config/configuration';
import type { AiProvider } from './ai-provider.interface';

@Module({
  imports: [BullModule.registerQueue({ name: AI_ENRICHMENT_QUEUE }), RealtimeModule, TicketsModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiEnrichmentProcessor,
    {
      provide: AI_PROVIDER,
      useFactory: (config: ConfigService<AppConfig, true>): AiProvider => {
        const aiConfig = config.get('ai', { infer: true });
        switch (aiConfig.provider) {
          case 'anthropic':
            return new AnthropicAiProvider(aiConfig);
          case 'mock':
            return new MockAiProvider();
          default:
            throw new Error(
              `AI_PROVIDER=${aiConfig.provider} is not implemented in this build (supported: anthropic, mock)`,
            );
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [AiService],
})
export class AiModule {}
