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
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ErrorsService } from './errors.service';

class UpdateErrorStatusDto {
  @IsIn(['NEW', 'PRACTICING', 'IMPROVING', 'RESOLVED', 'REPEATED'])
  status: string;
}

class PracticeAnswerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  answer: string;
}

@Controller('errors')
@UseGuards(JwtAuthGuard)
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query('status') status?: string) {
    return this.errorsService.list(user.userId, status);
  }

  @Get('practice')
  practiceTasks(@CurrentUser() user: JwtUser, @Query('limit') limit?: string) {
    return this.errorsService.getPracticeTasks(
      user.userId,
      limit ? Math.min(Number(limit) || 5, 20) : 5,
    );
  }

  @Post('practice/:id')
  submitPractice(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: PracticeAnswerDto,
  ) {
    return this.errorsService.submitPractice(user.userId, id, dto.answer);
  }

  @Get('daily-session')
  getDailySession(
    @CurrentUser() user: JwtUser,
    @Query('extra') extra?: string,
  ) {
    return this.errorsService.getDailySession(user.userId, extra === 'true');
  }

  @Post('daily-session/:id/submit')
  submitDailyPractice(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: PracticeAnswerDto,
  ) {
    return this.errorsService.submitDailyPractice(user.userId, id, dto.answer);
  }

  @Post('daily-session/:id/skip')
  skipDailyTask(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.errorsService.skipDailyTask(user.userId, id);
  }

  @Patch(':id')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateErrorStatusDto,
  ) {
    return this.errorsService.updateStatus(user.userId, id, dto.status);
  }

  @Delete(':id')
  deleteRecord(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.errorsService.deleteRecord(user.userId, id);
  }
}
