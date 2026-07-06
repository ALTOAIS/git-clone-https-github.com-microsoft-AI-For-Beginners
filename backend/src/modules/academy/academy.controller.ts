import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CourseStatus, Role } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AcademyService } from './academy.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

const MANAGE_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
];

@ApiTags('academy')
@Controller('courses')
@UseGuards(RolesGuard)
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get('summary')
  summary() {
    return this.academyService.summary();
  }

  @Get('my')
  myAssignments(@CurrentUser() user: AuthenticatedUser) {
    return this.academyService.myAssignments(user.id);
  }

  @Get('calendar')
  calendar() {
    return this.academyService.calendar();
  }

  @Get('matrix')
  matrix() {
    return this.academyService.matrix();
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: CourseStatus,
    @Query('search') search?: string,
  ) {
    return this.academyService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.academyService.findOne(id);
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.academyService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academyService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(...MANAGE_ROLES)
  remove(@Param('id') id: string) {
    return this.academyService.remove(id);
  }

  @Post(':id/modules')
  @Roles(...MANAGE_ROLES)
  addModule(@Param('id') id: string, @Body() dto: CreateModuleDto) {
    return this.academyService.addModule(id, dto);
  }

  @Patch(':id/modules/:moduleId')
  @Roles(...MANAGE_ROLES)
  updateModule(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.academyService.updateModule(id, moduleId, dto);
  }

  @Delete(':id/modules/:moduleId')
  @Roles(...MANAGE_ROLES)
  removeModule(@Param('id') id: string, @Param('moduleId') moduleId: string) {
    return this.academyService.removeModule(id, moduleId);
  }

  @Post(':id/modules/:moduleId/lessons')
  @Roles(...MANAGE_ROLES)
  addLesson(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.academyService.addLesson(id, moduleId, dto);
  }

  @Patch(':id/lessons/:lessonId')
  @Roles(...MANAGE_ROLES)
  updateLesson(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.academyService.updateLesson(id, lessonId, dto);
  }

  @Delete(':id/lessons/:lessonId')
  @Roles(...MANAGE_ROLES)
  removeLesson(@Param('id') id: string, @Param('lessonId') lessonId: string) {
    return this.academyService.removeLesson(id, lessonId);
  }

  @Post(':id/assignments')
  @Roles(...MANAGE_ROLES)
  assign(
    @Param('id') id: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academyService.assign(id, dto, user.id);
  }

  @Patch(':id/assignments/:assignmentId')
  async updateAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isManager = MANAGE_ROLES.some((role) => role === user.role);
    if (!isManager) {
      const assignment = await this.academyService.findAssignment(assignmentId);
      if (assignment.userId !== user.id) {
        throw new ForbiddenException(
          'Можно изменять только собственный прогресс обучения',
        );
      }
    }
    return this.academyService.updateAssignment(id, assignmentId, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  @Roles(...MANAGE_ROLES)
  removeAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.academyService.removeAssignment(id, assignmentId);
  }
}
