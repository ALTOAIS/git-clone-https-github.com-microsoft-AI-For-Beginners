import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  BulkCreatePhrasesDto,
  CreatePhraseDto,
  EvaluateTranslationDto,
  UpdateUserPhraseDto,
} from './phrases.dto';
import { PhrasesService } from './phrases.service';
import { TrainerMode, TrainerService } from './trainer.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PhrasesController {
  constructor(
    private readonly phrasesService: PhrasesService,
    private readonly trainerService: TrainerService,
  ) {}

  @Get('phrases')
  list(
    @CurrentUser() user: JwtUser,
    @Query('filter') filter?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.phrasesService.list(user.userId, filter, category, search);
  }

  @Get('phrases/categories')
  categories() {
    return this.phrasesService.getCategories();
  }

  @Get('phrases/of-the-day')
  phraseOfTheDay(@CurrentUser() user: JwtUser) {
    return this.phrasesService.phraseOfTheDay(user.userId);
  }

  @Post('phrases')
  create(@CurrentUser() user: JwtUser, @Body() dto: CreatePhraseDto) {
    return this.phrasesService.create(user.userId, dto);
  }

  @Post('phrases/bulk')
  bulkCreate(@CurrentUser() user: JwtUser, @Body() dto: BulkCreatePhrasesDto) {
    return this.phrasesService.bulkCreate(user.userId, dto.phrases);
  }

  @Patch('phrases/:id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserPhraseDto,
  ) {
    return this.phrasesService.update(user.userId, id, dto);
  }

  @Delete('phrases/:id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.phrasesService.remove(user.userId, id);
  }

  @Get('trainer/tasks')
  trainerTasks(
    @CurrentUser() user: JwtUser,
    @Query('mode') mode: TrainerMode = 'phrases',
    @Query('limit') limit?: string,
  ) {
    return this.trainerService.getTasks(
      user.userId,
      mode,
      limit ? Math.min(Number(limit) || 8, 20) : 8,
    );
  }

  @Post('trainer/evaluate')
  evaluate(@CurrentUser() user: JwtUser, @Body() dto: EvaluateTranslationDto) {
    return this.trainerService.evaluate(user.userId, dto);
  }
}
