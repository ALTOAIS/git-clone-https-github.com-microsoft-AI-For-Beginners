import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcademyModule } from '../academy/academy.module';
import { AnalysesModule } from '../analyses/analyses.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { RisksModule } from '../risks/risks.module';
import { RiskTemplatesModule } from '../risk-templates/risk-templates.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MaterialTextService } from './material-text.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { MockAiProvider } from './providers/mock-ai.provider';
import { RealAiProvider } from './providers/real-ai.provider';

const SUPPORTED_REAL_PROVIDERS = new Set([
  'openai',
  'anthropic',
  'anthropic-compatible',
]);

@Module({
  imports: [
    AnalysesModule,
    AcademyModule,
    AnalyticsModule,
    RisksModule,
    RiskTemplatesModule,
    IncidentsModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    MaterialTextService,
    MockAiProvider,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, MockAiProvider],
      useFactory: (config: ConfigService, mock: MockAiProvider) => {
        const logger = new Logger('AiProviderFactory');
        const provider = (config.get<string>('AI_PROVIDER') ?? 'mock')
          .trim()
          .toLowerCase();
        const apiKey = config.get<string>('AI_API_KEY');
        const model = config.get<string>('AI_MODEL');

        if (!SUPPORTED_REAL_PROVIDERS.has(provider)) {
          if (provider !== 'mock') {
            logger.warn(
              `Неизвестное значение AI_PROVIDER="${provider}" — используется MockAiProvider`,
            );
          }
          return mock;
        }
        if (!apiKey || !model) {
          logger.warn(
            `AI_PROVIDER=${provider}, но AI_API_KEY/AI_MODEL не заданы — используется MockAiProvider`,
          );
          return mock;
        }

        logger.log(
          `Реальный AI-провайдер активирован: ${provider}, модель ${model}`,
        );
        return new RealAiProvider(
          {
            provider,
            apiKey,
            model,
            baseUrl: config.get<string>('AI_BASE_URL') || undefined,
            temperature: Number(config.get('AI_TEMPERATURE') ?? 0.4),
            maxTokens: Number(config.get('AI_MAX_TOKENS') ?? 4000),
            timeoutMs: Number(config.get('AI_TIMEOUT_MS') ?? 60000),
            maxInputChars: Number(config.get('AI_MAX_INPUT_CHARS') ?? 24000),
          },
          mock,
        );
      },
    },
  ],
  exports: [AiService],
})
export class AiModule {}
