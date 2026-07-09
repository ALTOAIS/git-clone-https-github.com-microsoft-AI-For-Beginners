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
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateTestDto } from './dto/create-test.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UpdateTestDto } from './dto/update-test.dto';

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

  @Get('materials')
  @Roles(...MANAGE_ROLES)
  listMaterials() {
    return this.academyService.listMaterials();
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

  @Get(':id/preview')
  @Roles(...MANAGE_ROLES)
  preview(@Param('id') id: string) {
    return this.academyService.getPreview(id);
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

  @Get(':id/player')
  getPlayerData(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academyService.getPlayerData(id, user.id);
  }

  @Post(':id/lessons/:lessonId/complete')
  markLessonComplete(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academyService.markLessonComplete(id, lessonId, user.id);
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
  @Roles(...MANAGE_ROLES)
  updateAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
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

  // ------------------------------------------------------------------
  // Тестирование и Проверка знаний
  // ------------------------------------------------------------------

  @Get(':id/test')
  @Roles(...MANAGE_ROLES)
  getTest(@Param('id') id: string) {
    return this.academyService.getTest(id);
  }

  @Get(':id/test/for-attempt')
  getTestForAttempt(@Param('id') id: string) {
    return this.academyService.getTestForAttempt(id);
  }

  @Post(':id/test')
  @Roles(...MANAGE_ROLES)
  createTest(@Param('id') id: string, @Body() dto: CreateTestDto) {
    return this.academyService.createTest(id, dto);
  }

  @Patch(':id/test')
  @Roles(...MANAGE_ROLES)
  updateTest(@Param('id') id: string, @Body() dto: UpdateTestDto) {
    return this.academyService.updateTest(id, dto);
  }

  @Delete(':id/test')
  @Roles(...MANAGE_ROLES)
  removeTest(@Param('id') id: string) {
    return this.academyService.removeTest(id);
  }

  @Post(':id/test/questions')
  @Roles(...MANAGE_ROLES)
  addQuestion(@Param('id') id: string, @Body() dto: CreateQuestionDto) {
    return this.academyService.addQuestion(id, dto);
  }

  @Patch(':id/test/questions/:questionId')
  @Roles(...MANAGE_ROLES)
  updateQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.academyService.updateQuestion(id, questionId, dto);
  }

  @Delete(':id/test/questions/:questionId')
  @Roles(...MANAGE_ROLES)
  removeQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ) {
    return this.academyService.removeQuestion(id, questionId);
  }

  @Post(':id/test/attempts')
  submitAttempt(
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academyService.submitAttempt(id, user.id, dto);
  }

  @Get(':id/test/attempts/my')
  myAttempts(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.academyService.myAttempts(id, user.id);
  }

  @Get(':id/test/attempts')
  @Roles(...MANAGE_ROLES)
  allAttempts(@Param('id') id: string) {
    return this.academyService.allAttempts(id);
  }

  // ------------------------------------------------------------------
  // Тест-уроки (quiz)
  // ------------------------------------------------------------------

  @Get(':id/lessons/:lessonId/quiz')
  @Roles(...MANAGE_ROLES)
  getLessonQuiz(@Param('id') id: string, @Param('lessonId') lessonId: string) {
    return this.academyService.getLessonQuiz(id, lessonId);
  }

  @Get(':id/lessons/:lessonId/quiz/for-attempt')
  getLessonQuizForAttempt(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.academyService.getLessonQuizForAttempt(id, lessonId);
  }

  @Post(':id/lessons/:lessonId/quiz')
  @Roles(...MANAGE_ROLES)
  createLessonQuiz(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateTestDto,
  ) {
    return this.academyService.createLessonQuiz(id, lessonId, dto);
  }

  @Patch(':id/lessons/:lessonId/quiz')
  @Roles(...MANAGE_ROLES)
  updateLessonQuiz(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateTestDto,
  ) {
    return this.academyService.updateLessonQuiz(id, lessonId, dto);
  }

  @Delete(':id/lessons/:lessonId/quiz')
  @Roles(...MANAGE_ROLES)
  removeLessonQuiz(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.academyService.removeLessonQuiz(id, lessonId);
  }

  @Post(':id/lessons/:lessonId/quiz/questions')
  @Roles(...MANAGE_ROLES)
  addQuizQuestion(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.academyService.addQuizQuestion(id, lessonId, dto);
  }

  @Patch(':id/lessons/:lessonId/quiz/questions/:questionId')
  @Roles(...MANAGE_ROLES)
  updateQuizQuestion(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.academyService.updateQuizQuestion(
      id,
      lessonId,
      questionId,
      dto,
    );
  }

  @Delete(':id/lessons/:lessonId/quiz/questions/:questionId')
  @Roles(...MANAGE_ROLES)
  removeQuizQuestion(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.academyService.removeQuizQuestion(id, lessonId, questionId);
  }

  @Post(':id/lessons/:lessonId/quiz/attempts')
  submitQuizAttempt(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: SubmitQuizAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academyService.submitQuizAttempt(id, lessonId, user.id, dto);
  }

  @Get(':id/lessons/:lessonId/quiz/attempts/my')
  myQuizAttempts(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academyService.myQuizAttempts(id, lessonId, user.id);
  }

  @Get(':id/lessons/:lessonId/quiz/attempts')
  @Roles(...MANAGE_ROLES)
  allQuizAttempts(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.academyService.allQuizAttempts(id, lessonId);
  }
}
