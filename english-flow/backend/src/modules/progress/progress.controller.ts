import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
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

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  overview(@CurrentUser() user: JwtUser) {
    return this.progressService.getOverview(user.userId);
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
