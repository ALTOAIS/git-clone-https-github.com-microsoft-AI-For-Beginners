import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import { ConversationsService } from './conversations.service';

class StartConversationDto {
  @IsString()
  @IsNotEmpty()
  scenarioId: string;
}

class TurnDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  speakingSeconds?: number;
}

class SavePhraseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  english: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  russian: string;
}

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('scenarios')
  scenarios() {
    return this.conversationsService.getScenarios();
  }

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.conversationsService.list(user.userId);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.conversationsService.getById(user.userId, id);
  }

  @Post()
  start(@CurrentUser() user: JwtUser, @Body() dto: StartConversationDto) {
    return this.conversationsService.start(user.userId, dto.scenarioId);
  }

  @Post(':id/turns')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  addTurn(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: TurnDto,
  ) {
    return this.conversationsService.addTurn(
      user.userId,
      id,
      dto.text,
      dto.speakingSeconds,
    );
  }

  @Post(':id/finish')
  finish(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.conversationsService.finish(user.userId, id);
  }

  @Post(':id/save-phrase')
  savePhrase(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: SavePhraseDto,
  ) {
    return this.conversationsService.savePhrase(
      user.userId,
      id,
      dto.english,
      dto.russian,
    );
  }
}
