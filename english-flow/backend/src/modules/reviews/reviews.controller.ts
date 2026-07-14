import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewAttemptDto } from '../phrases/phrases.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('queue')
  getQueue(@CurrentUser() user: JwtUser, @Query('limit') limit?: string) {
    return this.reviewsService.getQueue(
      user.userId,
      limit ? Math.min(Number(limit) || 10, 30) : 10,
    );
  }

  @Post('attempt')
  submitAttempt(@CurrentUser() user: JwtUser, @Body() dto: ReviewAttemptDto) {
    return this.reviewsService.submitAttempt(user.userId, dto);
  }
}
