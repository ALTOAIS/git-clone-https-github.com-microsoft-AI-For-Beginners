import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';
import { ErrorsModule } from './modules/errors/errors.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { PhrasesModule } from './modules/phrases/phrases.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProgressModule } from './modules/progress/progress.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AiModule,
    AuthModule,
    UsersModule,
    PhrasesModule,
    ReviewsModule,
    ErrorsModule,
    LessonsModule,
    PlansModule,
    DiagnosticsModule,
    ConversationsModule,
    ProgressModule,
    MaterialsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
