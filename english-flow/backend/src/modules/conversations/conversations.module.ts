import { Module } from '@nestjs/common';
import { ErrorsModule } from '../errors/errors.module';
import { PhrasesModule } from '../phrases/phrases.module';
import { UsersModule } from '../users/users.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [ErrorsModule, PhrasesModule, UsersModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
