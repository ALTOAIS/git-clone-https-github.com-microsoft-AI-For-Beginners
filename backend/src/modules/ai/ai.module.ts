import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { MockAiProvider } from './providers/mock-ai.provider';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    MockAiProvider,
    { provide: AI_PROVIDER, useClass: MockAiProvider },
  ],
  exports: [AiService],
})
export class AiModule {}
