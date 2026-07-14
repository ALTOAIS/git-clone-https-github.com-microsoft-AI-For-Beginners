import { Module } from '@nestjs/common';
import { ErrorsModule } from '../errors/errors.module';
import { UsersModule } from '../users/users.module';
import { PhrasesController } from './phrases.controller';
import { PhrasesService } from './phrases.service';
import { TrainerService } from './trainer.service';

@Module({
  imports: [ErrorsModule, UsersModule],
  controllers: [PhrasesController],
  providers: [PhrasesService, TrainerService],
  exports: [PhrasesService],
})
export class PhrasesModule {}
