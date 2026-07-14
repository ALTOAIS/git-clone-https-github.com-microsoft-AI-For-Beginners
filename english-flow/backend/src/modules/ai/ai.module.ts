import { Global, Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { LlmClient } from './llm.client';

@Global()
@Module({
  providers: [LlmClient, AiService],
  exports: [AiService],
})
export class AiModule {}
