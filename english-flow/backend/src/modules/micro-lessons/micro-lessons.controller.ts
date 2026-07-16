import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MicroCategoryString } from '../ai/ai.types';
import {
  CompleteMicroLessonDto,
  GenerateMicroLessonDto,
} from './micro-lessons.dto';
import { MicroLessonsService } from './micro-lessons.service';

@Controller('micro-lessons')
@UseGuards(JwtAuthGuard)
export class MicroLessonsController {
  constructor(private readonly microLessonsService: MicroLessonsService) {}

  @Get('eligible')
  eligible(@CurrentUser() user: JwtUser) {
    return this.microLessonsService.getEligible(user.userId);
  }

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.microLessonsService.list(user.userId);
  }

  @Post('generate')
  generate(@CurrentUser() user: JwtUser, @Body() dto: GenerateMicroLessonDto) {
    return this.microLessonsService.generate(
      user.userId,
      dto.category as MicroCategoryString,
    );
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.microLessonsService.getById(user.userId, id);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: CompleteMicroLessonDto,
  ) {
    return this.microLessonsService.complete(user.userId, id, dto.answers);
  }

  @Post(':id/dismiss')
  dismiss(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.microLessonsService.dismiss(user.userId, id);
  }
}
