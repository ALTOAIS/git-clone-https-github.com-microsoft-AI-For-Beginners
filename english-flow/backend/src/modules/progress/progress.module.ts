import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [UsersModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
