import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AnalysisStatus, Role } from '@prisma/client';
import { Response } from 'express';
import { join, resolve } from 'path';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { analysisDocumentsMulterOptions } from './analysis-documents.multer.config';
import { AnalysesService } from './analyses.service';
import { AssessAnalysisRiskDto } from './dto/assess-analysis-risk.dto';
import { ChangeStageDto } from './dto/change-stage.dto';
import { CreateActionItemDto } from './dto/create-action-item.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { CreateAnalysisRiskDto } from './dto/create-analysis-risk.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateFactorDto } from './dto/create-factor.dto';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { CreateProcessStepDto } from './dto/create-process-step.dto';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { CreateWorkingGroupMemberDto } from './dto/create-working-group-member.dto';
import { UpdateActionItemDto } from './dto/update-action-item.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { UpdateAnalysisRiskDto } from './dto/update-analysis-risk.dto';
import { UpdateFactorDto } from './dto/update-factor.dto';
import { UpdateProcessStepDto } from './dto/update-process-step.dto';
import { UpdateReassessmentDto } from './dto/update-reassessment.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { UpdateWorkingGroupMemberDto } from './dto/update-working-group-member.dto';

const MANAGE_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
];
const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './uploads');

@ApiTags('analyses')
@Controller('analyses')
@UseGuards(RolesGuard)
export class AnalysesController {
  private readonly uploadDir = UPLOAD_DIR;

  constructor(private readonly analysesService: AnalysesService) {}

  @Get('summary')
  summary() {
    return this.analysesService.summary();
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: AnalysisStatus,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
  ) {
    return this.analysesService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      companyId,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analysesService.findOne(id);
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(
    @Body() dto: CreateAnalysisDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysesService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnalysisDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysesService.update(id, dto, user.id);
  }

  @Patch(':id/stage')
  @Roles(...MANAGE_ROLES)
  changeStage(
    @Param('id') id: string,
    @Body() dto: ChangeStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysesService.changeStage(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER)
  remove(@Param('id') id: string) {
    return this.analysesService.remove(id);
  }

  @Post(':id/plan-items')
  @Roles(...MANAGE_ROLES)
  addPlanItem(@Param('id') id: string, @Body() dto: CreatePlanItemDto) {
    return this.analysesService.addPlanItem(id, dto);
  }

  @Patch(':id/plan-items/:itemId')
  @Roles(...MANAGE_ROLES)
  updatePlanItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreatePlanItemDto,
  ) {
    return this.analysesService.updatePlanItem(id, itemId, dto);
  }

  @Delete(':id/plan-items/:itemId')
  @Roles(...MANAGE_ROLES)
  removePlanItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.analysesService.removePlanItem(id, itemId);
  }

  @Post(':id/working-group')
  @Roles(...MANAGE_ROLES)
  addWorkingGroupMember(
    @Param('id') id: string,
    @Body() dto: CreateWorkingGroupMemberDto,
  ) {
    return this.analysesService.addWorkingGroupMember(id, dto);
  }

  @Patch(':id/working-group/:memberId')
  @Roles(...MANAGE_ROLES)
  updateWorkingGroupMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateWorkingGroupMemberDto,
  ) {
    return this.analysesService.updateWorkingGroupMember(id, memberId, dto);
  }

  @Delete(':id/working-group/:memberId')
  @Roles(...MANAGE_ROLES)
  removeWorkingGroupMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.analysesService.removeWorkingGroupMember(id, memberId);
  }

  @Post(':id/documents')
  @Roles(...MANAGE_ROLES)
  @UseInterceptors(
    FileInterceptor('file', analysisDocumentsMulterOptions(UPLOAD_DIR)),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Файл не был загружен');
    return this.analysesService.addDocument({
      analysisId: id,
      category,
      file,
      uploadedById: user.id,
    });
  }

  @Get(':id/documents/:docId/download')
  async downloadDocument(@Param('docId') docId: string, @Res() res: Response) {
    const document = await this.analysesService.findDocument(docId);
    return res.download(
      join(this.uploadDir, document.storedName),
      document.fileName,
    );
  }

  @Delete(':id/documents/:docId')
  @Roles(...MANAGE_ROLES)
  removeDocument(@Param('docId') docId: string) {
    return this.analysesService.removeDocument(docId);
  }

  @Post(':id/process-steps')
  @Roles(...MANAGE_ROLES)
  addProcessStep(@Param('id') id: string, @Body() dto: CreateProcessStepDto) {
    return this.analysesService.addProcessStep(id, dto);
  }

  @Patch(':id/process-steps/:stepId')
  @Roles(...MANAGE_ROLES)
  updateProcessStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateProcessStepDto,
  ) {
    return this.analysesService.updateProcessStep(id, stepId, dto);
  }

  @Delete(':id/process-steps/:stepId')
  @Roles(...MANAGE_ROLES)
  removeProcessStep(@Param('id') id: string, @Param('stepId') stepId: string) {
    return this.analysesService.removeProcessStep(id, stepId);
  }

  @Post(':id/factors')
  @Roles(...MANAGE_ROLES)
  addFactor(@Param('id') id: string, @Body() dto: CreateFactorDto) {
    return this.analysesService.addFactor(id, dto);
  }

  @Patch(':id/factors/:factorId')
  @Roles(...MANAGE_ROLES)
  updateFactor(
    @Param('id') id: string,
    @Param('factorId') factorId: string,
    @Body() dto: UpdateFactorDto,
  ) {
    return this.analysesService.updateFactor(id, factorId, dto);
  }

  @Delete(':id/factors/:factorId')
  @Roles(...MANAGE_ROLES)
  removeFactor(@Param('id') id: string, @Param('factorId') factorId: string) {
    return this.analysesService.removeFactor(id, factorId);
  }

  @Post(':id/risks')
  @Roles(...MANAGE_ROLES)
  addRisk(@Param('id') id: string, @Body() dto: CreateAnalysisRiskDto) {
    return this.analysesService.addRisk(id, dto);
  }

  @Patch(':id/risks/:riskId')
  @Roles(...MANAGE_ROLES)
  updateRisk(
    @Param('id') id: string,
    @Param('riskId') riskId: string,
    @Body() dto: UpdateAnalysisRiskDto,
  ) {
    return this.analysesService.updateRisk(id, riskId, dto);
  }

  @Delete(':id/risks/:riskId')
  @Roles(...MANAGE_ROLES)
  removeRisk(@Param('id') id: string, @Param('riskId') riskId: string) {
    return this.analysesService.removeRisk(id, riskId);
  }

  @Patch(':id/risks/:riskId/assess')
  @Roles(...MANAGE_ROLES)
  assessRisk(
    @Param('id') id: string,
    @Param('riskId') riskId: string,
    @Body() dto: AssessAnalysisRiskDto,
  ) {
    return this.analysesService.assessRisk(id, riskId, dto);
  }

  @Post(':id/recommendations')
  @Roles(...MANAGE_ROLES)
  addRecommendation(
    @Param('id') id: string,
    @Body() dto: CreateRecommendationDto,
  ) {
    return this.analysesService.addRecommendation(id, dto);
  }

  @Patch(':id/recommendations/:recommendationId')
  @Roles(...MANAGE_ROLES)
  updateRecommendation(
    @Param('id') id: string,
    @Param('recommendationId') recommendationId: string,
    @Body() dto: UpdateRecommendationDto,
  ) {
    return this.analysesService.updateRecommendation(id, recommendationId, dto);
  }

  @Delete(':id/recommendations/:recommendationId')
  @Roles(...MANAGE_ROLES)
  removeRecommendation(
    @Param('id') id: string,
    @Param('recommendationId') recommendationId: string,
  ) {
    return this.analysesService.removeRecommendation(id, recommendationId);
  }

  @Post(':id/action-items')
  @Roles(...MANAGE_ROLES)
  addActionItem(@Param('id') id: string, @Body() dto: CreateActionItemDto) {
    return this.analysesService.addActionItem(id, dto);
  }

  @Patch(':id/action-items/:itemId')
  @Roles(...MANAGE_ROLES)
  updateActionItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateActionItemDto,
  ) {
    return this.analysesService.updateActionItem(id, itemId, dto);
  }

  @Delete(':id/action-items/:itemId')
  @Roles(...MANAGE_ROLES)
  removeActionItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.analysesService.removeActionItem(id, itemId);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysesService.addComment(id, dto, user.id);
  }

  @Delete(':id/comments/:commentId')
  removeComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.analysesService.removeComment(id, commentId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.analysesService.getHistory(id);
  }

  @Post(':id/approve')
  @Roles(...MANAGE_ROLES)
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.analysesService.approve(id, user.id);
  }

  @Patch(':id/reassessment')
  @Roles(...MANAGE_ROLES)
  updateReassessment(
    @Param('id') id: string,
    @Body() dto: UpdateReassessmentDto,
  ) {
    return this.analysesService.updateReassessment(id, dto);
  }
}
