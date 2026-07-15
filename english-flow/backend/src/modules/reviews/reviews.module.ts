import { Module } from '@nestjs/common';
import { ErrorsModule } from '../errors/errors.module';
import { UsersModule } from '../users/users.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [UsersModule, ErrorsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
