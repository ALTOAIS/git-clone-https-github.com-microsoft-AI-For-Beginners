import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiagnosticsService } from './diagnostics.service';

class SubmitDiagnosticDto {
  @IsObject()
  choiceAnswers: Record<string, number>;

  @IsObject()
  writingAnswers: Record<string, string>;

  @IsObject()
  speakingTranscripts: Record<string, string>;
}

@Controller('diagnostics')
@UseGuards(JwtAuthGuard)
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get('test')
  getTest() {
    return this.diagnosticsService.getTest();
  }

  @Post('submit')
  submit(@CurrentUser() user: JwtUser, @Body() dto: SubmitDiagnosticDto) {
    return this.diagnosticsService.submit(user.userId, dto);
  }
}
