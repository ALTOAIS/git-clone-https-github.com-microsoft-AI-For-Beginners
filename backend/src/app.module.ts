import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';

import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { BusinessProcessesModule } from './modules/business-processes/business-processes.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SourcesModule } from './modules/sources/sources.module';
import { RisksModule } from './modules/risks/risks.module';
import { ControlsModule } from './modules/controls/controls.module';
import { ActionsModule } from './modules/actions/actions.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalysesModule } from './modules/analyses/analyses.module';
import { AcademyModule } from './modules/academy/academy.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { TrainingPlansModule } from './modules/training-plans/training-plans.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    DepartmentsModule,
    BusinessProcessesModule,
    CategoriesModule,
    SourcesModule,
    RisksModule,
    ControlsModule,
    ActionsModule,
    IncidentsModule,
    CommentsModule,
    AttachmentsModule,
    AnalyticsModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    AnalysesModule,
    AcademyModule,
    SurveysModule,
    CampaignsModule,
    TrainingPlansModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
