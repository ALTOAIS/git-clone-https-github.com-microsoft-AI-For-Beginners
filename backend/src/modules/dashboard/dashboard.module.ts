import { Module } from '@nestjs/common';
import { AcademyModule } from '../academy/academy.module';
import { AnalysesModule } from '../analyses/analyses.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AnalyticsModule, AnalysesModule, AcademyModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
