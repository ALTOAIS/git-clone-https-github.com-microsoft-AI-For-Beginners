import { Module } from '@nestjs/common';
import { ErrorsModule } from '../errors/errors.module';
import { PhrasesModule } from '../phrases/phrases.module';
import { UsersModule } from '../users/users.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [ErrorsModule, PhrasesModule, UsersModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
