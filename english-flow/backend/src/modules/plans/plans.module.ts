import { Module } from '@nestjs/common';
import { LessonsModule } from '../lessons/lessons.module';
import { UsersModule } from '../users/users.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [LessonsModule, UsersModule],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
