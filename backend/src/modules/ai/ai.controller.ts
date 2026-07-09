import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AiService } from './ai.service';
import { AnalyzeRiskDto } from './dto/analyze-risk.dto';
import { ChatDto } from './dto/chat.dto';
import { GenerateCampaignMessageDto } from './dto/generate-campaign-message.dto';
import { GenerateCaseStudyDto } from './dto/generate-case-study.dto';
import { GenerateCourseOutlineDto } from './dto/generate-course-outline.dto';
import { GenerateLessonContentDto } from './dto/generate-lesson-content.dto';
import { GenerateMemoDto } from './dto/generate-memo.dto';
import { GenerateQuizQuestionsDto } from './dto/generate-quiz-questions.dto';
import { GenerateRiskRegisterEntryDto } from './dto/generate-risk-register-entry.dto';
import { GenerateRiskTemplateForProcessDto } from './dto/generate-risk-template-for-process.dto';
import { GenerateVakrReportDto } from './dto/generate-vakr-report.dto';
import { ImproveRiskTemplateDescriptionDto } from './dto/improve-risk-template-description.dto';
import { ReviewVakrAnalysisDto } from './dto/review-vakr-analysis.dto';
import { SuggestControlsDto } from './dto/suggest-controls.dto';
import { SuggestRiskTemplateActionsDto } from './dto/suggest-risk-template-actions.dto';
import { SuggestRiskTemplateControlsDto } from './dto/suggest-risk-template-controls.dto';

const SENSITIVE_AI_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
  Role.INTERNAL_AUDIT,
];

const ACADEMY_AI_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
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

  @Post('improve-risk-template-description')
  @Roles(...SENSITIVE_AI_ROLES)
  improveRiskTemplateDescription(
    @Body() dto: ImproveRiskTemplateDescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.improveRiskTemplateDescription(dto, user);
  }

  @Post('suggest-risk-template-controls')
  @Roles(...SENSITIVE_AI_ROLES)
  suggestRiskTemplateControls(
    @Body() dto: SuggestRiskTemplateControlsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.suggestRiskTemplateControls(dto, user);
  }

  @Post('suggest-risk-template-actions')
  @Roles(...SENSITIVE_AI_ROLES)
  suggestRiskTemplateActions(
    @Body() dto: SuggestRiskTemplateActionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.suggestRiskTemplateActions(dto, user);
  }

  @Post('generate-risk-template-for-process')
  @Roles(...SENSITIVE_AI_ROLES)
  generateRiskTemplateForProcess(
    @Body() dto: GenerateRiskTemplateForProcessDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateRiskTemplateForProcess(dto, user);
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

  @Get('generate-vakr-report/:analysisId/pdf')
  @Roles(...SENSITIVE_AI_ROLES)
  async generateVakrReportPdf(
    @Param('analysisId') analysisId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const buffer = await this.aiService.generateVakrReportPdf(
      { analysisId },
      user,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="vakr-report-${analysisId}.pdf"`,
    });
    return res.send(buffer);
  }

  @Get('generate-vakr-report/:analysisId/docx')
  @Roles(...SENSITIVE_AI_ROLES)
  async generateVakrReportDocx(
    @Param('analysisId') analysisId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const buffer = await this.aiService.generateVakrReportDocx(
      { analysisId },
      user,
    );
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="vakr-report-${analysisId}.docx"`,
    });
    return res.send(buffer);
  }

  @Post('generate-risk-register-entry')
  @Roles(...SENSITIVE_AI_ROLES)
  generateRiskRegisterEntry(
    @Body() dto: GenerateRiskRegisterEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateRiskRegisterEntry(dto, user);
  }

  @Get('risk-intelligence-dashboard')
  @Roles(...SENSITIVE_AI_ROLES)
  getRiskIntelligenceDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.aiService.getRiskIntelligenceDashboard(user);
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

  @Post('generate-course-outline')
  @Roles(...ACADEMY_AI_ROLES)
  generateCourseOutline(
    @Body() dto: GenerateCourseOutlineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateCourseOutline(dto, user);
  }

  @Post('generate-lesson-content')
  @Roles(...ACADEMY_AI_ROLES)
  generateLessonContent(
    @Body() dto: GenerateLessonContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateLessonContent(dto, user);
  }

  @Post('generate-quiz-questions')
  @Roles(...ACADEMY_AI_ROLES)
  generateQuizQuestions(
    @Body() dto: GenerateQuizQuestionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateQuizQuestions(dto, user);
  }

  @Post('generate-case-study')
  @Roles(...ACADEMY_AI_ROLES)
  generateCaseStudy(
    @Body() dto: GenerateCaseStudyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateCaseStudy(dto, user);
  }

  @Post('generate-memo')
  @Roles(...ACADEMY_AI_ROLES)
  generateMemo(
    @Body() dto: GenerateMemoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateMemo(dto, user);
  }

  @Post('generate-campaign-message')
  @Roles(...ACADEMY_AI_ROLES)
  generateCampaignMessage(
    @Body() dto: GenerateCampaignMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateCampaignMessage(dto, user);
  }
}
