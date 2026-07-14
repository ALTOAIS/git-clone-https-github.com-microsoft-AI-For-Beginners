import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  EvaluateSentenceDto,
  FinishAttemptDto,
  GenerateLessonDto,
  UpdateLessonDto,
} from './lessons.dto';
import { LessonsService } from './lessons.service';

@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.lessonsService.list(user.userId);
  }

  @Get('today')
  today(@CurrentUser() user: JwtUser) {
    return this.lessonsService.getTodayLesson(user.userId);
  }

  @Post('generate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  generate(@CurrentUser() user: JwtUser, @Body() dto: GenerateLessonDto) {
    return this.lessonsService.generate(user.userId, dto);
  }

  @Post('evaluate-sentence')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  evaluateSentence(
    @CurrentUser() user: JwtUser,
    @Body() dto: EvaluateSentenceDto,
  ) {
    return this.lessonsService.evaluateSentence(user.userId, dto);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.lessonsService.getById(user.userId, id);
  }

  @Post(':id/attempts')
  startAttempt(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.lessonsService.startAttempt(user.userId, id);
  }

  @Patch('attempts/:attemptId')
  finishAttempt(
    @CurrentUser() user: JwtUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: FinishAttemptDto,
  ) {
    return this.lessonsService.finishAttempt(user.userId, attemptId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.lessonsService.remove(user.userId, id);
  }
}
