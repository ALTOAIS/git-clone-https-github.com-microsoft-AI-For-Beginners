import { Module } from '@nestjs/common';
import { AcademyModule } from '../academy/academy.module';
import { AnalysesModule } from '../analyses/analyses.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { RisksModule } from '../risks/risks.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { MockAiProvider } from './providers/mock-ai.provider';

@Module({
  imports: [
    AnalysesModule,
    AcademyModule,
    AnalyticsModule,
    RisksModule,
    IncidentsModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    MockAiProvider,
    { provide: AI_PROVIDER, useClass: MockAiProvider },
  ],
  exports: [AiService],
})
export class AiModule {}
