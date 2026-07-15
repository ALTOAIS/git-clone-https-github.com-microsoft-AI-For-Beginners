import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressService } from './progress.service';

class SaveBenchmarkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prompt: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  transcript: string;

  @IsInt()
  @Min(0)
  durationSec: number;

  /** Аудио в data URL (до ~2 МБ), хранится по желанию пользователя */
  @IsOptional()
  @IsString()
  @MaxLength(2_800_000)
  audioDataUrl?: string;
}

class DailyHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;
}

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  overview(@CurrentUser() user: JwtUser) {
    return this.progressService.getOverview(user.userId);
  }

  @Get('daily-summary')
  dailySummary(@CurrentUser() user: JwtUser) {
    return this.progressService.getDailySummary(user.userId);
  }

  @Get('daily-history')
  dailyHistory(
    @CurrentUser() user: JwtUser,
    @Query() query: DailyHistoryQueryDto,
  ) {
    return this.progressService.getDailyHistory(user.userId, query.days ?? 30);
  }

  @Post('benchmark')
  saveBenchmark(@CurrentUser() user: JwtUser, @Body() dto: SaveBenchmarkDto) {
    return this.progressService.saveBenchmark(user.userId, dto);
  }

  @Get('benchmark/:id')
  getBenchmark(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.progressService.getBenchmark(user.userId, id);
  }
}
