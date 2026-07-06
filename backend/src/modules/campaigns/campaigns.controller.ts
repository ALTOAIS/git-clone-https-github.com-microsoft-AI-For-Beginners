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
import { CampaignStatus, Role } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { LinkCourseDto } from './dto/link-course.dto';
import { LinkSurveyDto } from './dto/link-survey.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

const MANAGE_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
];

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(RolesGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: CampaignStatus,
    @Query('search') search?: string,
  ) {
    return this.campaignsService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.campaignsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.campaignsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(...MANAGE_ROLES)
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }

  @Post(':id/courses')
  @Roles(...MANAGE_ROLES)
  linkCourse(@Param('id') id: string, @Body() dto: LinkCourseDto) {
    return this.campaignsService.linkCourse(id, dto);
  }

  @Delete(':id/courses/:courseId')
  @Roles(...MANAGE_ROLES)
  unlinkCourse(@Param('id') id: string, @Param('courseId') courseId: string) {
    return this.campaignsService.unlinkCourse(id, courseId);
  }

  @Post(':id/surveys')
  @Roles(...MANAGE_ROLES)
  linkSurvey(@Param('id') id: string, @Body() dto: LinkSurveyDto) {
    return this.campaignsService.linkSurvey(id, dto);
  }

  @Delete(':id/surveys/:surveyId')
  @Roles(...MANAGE_ROLES)
  unlinkSurvey(@Param('id') id: string, @Param('surveyId') surveyId: string) {
    return this.campaignsService.unlinkSurvey(id, surveyId);
  }

  @Get(':id/progress')
  @Roles(...MANAGE_ROLES)
  getProgress(@Param('id') id: string) {
    return this.campaignsService.getProgress(id);
  }
}
