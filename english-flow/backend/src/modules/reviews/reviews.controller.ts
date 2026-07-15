import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewAttemptDto, ReviewEvaluateDto } from '../phrases/phrases.dto';
import { ReviewsService, SessionSize, SESSION_SIZES } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('queue')
  getQueue(@CurrentUser() user: JwtUser, @Query('session') session?: string) {
    const size: SessionSize =
      session && session in SESSION_SIZES
        ? (session as SessionSize)
        : 'standard';
    return this.reviewsService.getQueue(user.userId, size);
  }

  @Post('evaluate')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  evaluate(@CurrentUser() user: JwtUser, @Body() dto: ReviewEvaluateDto) {
    return this.reviewsService.evaluate(user.userId, dto);
  }

  @Post('attempt')
  submitAttempt(@CurrentUser() user: JwtUser, @Body() dto: ReviewAttemptDto) {
    return this.reviewsService.submitAttempt(user.userId, dto);
  }
}
