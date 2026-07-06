import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AiService } from './ai.service';
import { AnalyzeRiskDto } from './dto/analyze-risk.dto';
import { ChatDto } from './dto/chat.dto';
import { GenerateRiskRegisterEntryDto } from './dto/generate-risk-register-entry.dto';
import { GenerateVakrReportDto } from './dto/generate-vakr-report.dto';
import { ReviewVakrAnalysisDto } from './dto/review-vakr-analysis.dto';
import { SuggestControlsDto } from './dto/suggest-controls.dto';

const SENSITIVE_AI_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
  Role.INTERNAL_AUDIT,
];

@ApiTags('ai')
@Controller('ai')
@UseGuards(RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze-risk')
  @Roles(...SENSITIVE_AI_ROLES)
  analyzeRisk(
    @Body() dto: AnalyzeRiskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.analyzeRisk(dto, user);
  }

  @Post('suggest-controls')
  @Roles(...SENSITIVE_AI_ROLES)
  suggestControls(
    @Body() dto: SuggestControlsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.suggestControls(dto, user);
  }

  @Post('review-vakr-analysis')
  @Roles(...SENSITIVE_AI_ROLES)
  reviewVakrAnalysis(
    @Body() dto: ReviewVakrAnalysisDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.reviewVakrAnalysis(dto, user);
  }

  @Post('generate-vakr-report')
  @Roles(...SENSITIVE_AI_ROLES)
  generateVakrReport(
    @Body() dto: GenerateVakrReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateVakrReport(dto, user);
  }

  @Post('generate-risk-register-entry')
  @Roles(...SENSITIVE_AI_ROLES)
  generateRiskRegisterEntry(
    @Body() dto: GenerateRiskRegisterEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateRiskRegisterEntry(dto, user);
  }

  @Post('chat')
  chat(@Body() dto: ChatDto, @CurrentUser() user: AuthenticatedUser) {
    const isSensitiveContext = dto.contextEntityType === 'ANALYSIS';
    if (
      isSensitiveContext &&
      !SENSITIVE_AI_ROLES.some((role) => role === user.role)
    ) {
      throw new ForbiddenException(
        'Недостаточно прав для обращения к ИИ-ассистенту в контексте анализа ВАКР',
      );
    }
    return this.aiService.chat(dto, user);
  }
}
