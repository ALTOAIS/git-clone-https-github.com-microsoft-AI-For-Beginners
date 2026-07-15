import { Controller, Get } from '@nestjs/common';
import { AiService } from './modules/ai/ai.service';
import { PrismaService } from './prisma/prisma.service';

/**
 * Публичный health-endpoint для мониторинга и Render health checks.
 *
 * Поле `ai` отражает режим работы ИИ, НЕ раскрывая секретов:
 * не возвращаются AI_API_KEY, AI_BASE_URL, provider, model или текст
 * ошибок провайдера. Для диагностики provider/model остаются только
 * в серверных логах (LlmClient при старте).
 */
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    // configured === true только если одновременно заданы корректный
    // AI_PROVIDER (openai|anthropic|anthropic-compatible), AI_API_KEY и AI_MODEL.
    const configured = this.ai.isRealAi;
    return {
      status: 'ok',
      service: 'english-flow-api',
      time: new Date().toISOString(),
      ai: {
        configured,
        mode: configured ? ('llm' as const) : ('fallback' as const),
      },
    };
  }
}
