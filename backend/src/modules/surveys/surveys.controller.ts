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
import { ApiTags } from '@nestjs/swagger';
import { Role, SurveyStatus } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { UpdateSurveyQuestionDto } from './dto/update-survey-question.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { SurveysService } from './surveys.service';

const MANAGE_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
];

@ApiTags('surveys')
@Controller('surveys')
@UseGuards(RolesGuard)
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: SurveyStatus,
    @Query('search') search?: string,
  ) {
    return this.surveysService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.surveysService.findOne(id);
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(@Body() dto: CreateSurveyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.surveysService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSurveyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.surveysService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(...MANAGE_ROLES)
  remove(@Param('id') id: string) {
    return this.surveysService.remove(id);
  }

  @Post(':id/questions')
  @Roles(...MANAGE_ROLES)
  addQuestion(@Param('id') id: string, @Body() dto: CreateSurveyQuestionDto) {
    return this.surveysService.addQuestion(id, dto);
  }

  @Patch(':id/questions/:questionId')
  @Roles(...MANAGE_ROLES)
  updateQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateSurveyQuestionDto,
  ) {
    return this.surveysService.updateQuestion(id, questionId, dto);
  }

  @Delete(':id/questions/:questionId')
  @Roles(...MANAGE_ROLES)
  removeQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ) {
    return this.surveysService.removeQuestion(id, questionId);
  }

  @Post(':id/responses')
  submitResponse(
    @Param('id') id: string,
    @Body() dto: SubmitResponseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.surveysService.submitResponse(id, user.id, dto);
  }

  @Get(':id/responses/my')
  myResponse(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.surveysService.myResponse(id, user.id);
  }

  @Get(':id/results')
  @Roles(...MANAGE_ROLES)
  getResults(@Param('id') id: string) {
    return this.surveysService.getResults(id);
  }
}
