import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('heatmap')
  heatmap(@Query('kind') kind?: 'inherent' | 'residual') {
    return this.analyticsService.heatmap(kind);
  }

  @Get('trends')
  trends(@Query('months') months?: string) {
    return this.analyticsService.trends(months ? Number(months) : undefined);
  }

  @Get('top-risks')
  topRisks(@Query('limit') limit?: string) {
    return this.analyticsService.topRisks(limit ? Number(limit) : undefined);
  }

  @Get('top-companies')
  topCompanies(@Query('limit') limit?: string) {
    return this.analyticsService.topCompanies(limit ? Number(limit) : undefined);
  }

  @Get('top-departments')
  topDepartments(@Query('limit') limit?: string) {
    return this.analyticsService.topDepartments(limit ? Number(limit) : undefined);
  }

  @Get('top-categories')
  topCategories(@Query('limit') limit?: string) {
    return this.analyticsService.topCategories(limit ? Number(limit) : undefined);
  }

  @Get('top-sources')
  topSources(@Query('limit') limit?: string) {
    return this.analyticsService.topSources(limit ? Number(limit) : undefined);
  }

  @Get('control-effectiveness')
  controlEffectiveness() {
    return this.analyticsService.controlEffectiveness();
  }

  @Get('residual-risk')
  residualRiskSummary() {
    return this.analyticsService.residualRiskSummary();
  }
}
