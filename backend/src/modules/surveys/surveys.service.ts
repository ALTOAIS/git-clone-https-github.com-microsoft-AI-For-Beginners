import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SurveyQuestionType, SurveyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { UpdateSurveyQuestionDto } from './dto/update-survey-question.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';

const DETAIL_INCLUDE = {
  createdBy: { select: { id: true, fullName: true, email: true } },
  questions: {
    include: { options: { orderBy: { order: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
} satisfies Prisma.SurveyInclude;

const LIST_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  _count: { select: { questions: true, responses: true } },
} satisfies Prisma.SurveyInclude;

@Injectable()
export class SurveysService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: {
    page: number;
    pageSize: number;
    status?: SurveyStatus;
    search?: string;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.SurveyWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.survey.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.survey.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!survey) throw new NotFoundException('Опрос не найден');
    return survey;
  }

  async create(dto: CreateSurveyDto, userId?: string) {
    const survey = await this.prisma.survey.create({
      data: { ...dto, createdById: userId },
      include: DETAIL_INCLUDE,
    });
    await this.audit.record({
      entityType: 'SURVEY',
      entityId: survey.id,
      action: 'CREATE',
      userId,
    });
    return survey;
  }

  async update(id: string, dto: UpdateSurveyDto, userId?: string) {
    await this.findOne(id);
    const survey = await this.prisma.survey.update({
      where: { id },
      data: dto,
      include: DETAIL_INCLUDE,
    });
    await this.audit.record({
      entityType: 'SURVEY',
      entityId: id,
      action: 'UPDATE',
      userId,
    });
    return survey;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.survey.delete({ where: { id } });
  }

  async addQuestion(surveyId: string, dto: CreateSurveyQuestionDto) {
    await this.findOne(surveyId);
    return this.prisma.surveyQuestion.create({
      data: {
        surveyId,
        order: dto.order,
        type: dto.type,
        text: dto.text,
        options: dto.options ? { create: dto.options } : undefined,
      },
      include: { options: true },
    });
  }

  async updateQuestion(
    surveyId: string,
    questionId: string,
    dto: UpdateSurveyQuestionDto,
  ) {
    await this.findOne(surveyId);
    return this.prisma.surveyQuestion.update({
      where: { id: questionId },
      data: {
        order: dto.order,
        type: dto.type,
        text: dto.text,
        ...(dto.options
          ? { options: { deleteMany: {}, create: dto.options } }
          : {}),
      },
      include: { options: true },
    });
  }

  async removeQuestion(surveyId: string, questionId: string) {
    await this.findOne(surveyId);
    return this.prisma.surveyQuestion.delete({ where: { id: questionId } });
  }

  async submitResponse(
    surveyId: string,
    userId: string,
    dto: SubmitResponseDto,
  ) {
    await this.findOne(surveyId);
    const existing = await this.prisma.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId, userId } },
    });
    if (existing) throw new BadRequestException('Вы уже прошли этот опрос');
    return this.prisma.surveyResponse.create({
      data: { surveyId, userId, answers: dto.answers as Prisma.InputJsonValue },
    });
  }

  async myResponse(surveyId: string, userId: string) {
    return this.prisma.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId, userId } },
    });
  }

  async getResults(surveyId: string) {
    const survey = await this.findOne(surveyId);
    const responses = await this.prisma.surveyResponse.findMany({
      where: { surveyId },
      include: { user: { select: { id: true, fullName: true } } },
    });

    const questions = survey.questions.map((q) => {
      const rawAnswers = responses.map(
        (r) => (r.answers as Record<string, unknown>)[q.id],
      );

      if (
        q.type === SurveyQuestionType.SINGLE_CHOICE ||
        q.type === SurveyQuestionType.MULTIPLE_CHOICE
      ) {
        const optionCounts = q.options.map((o) => ({
          optionId: o.id,
          text: o.text,
          count: rawAnswers.filter((a) =>
            Array.isArray(a) ? a.includes(o.id) : a === o.id,
          ).length,
        }));
        return { id: q.id, type: q.type, text: q.text, optionCounts };
      }

      if (q.type === SurveyQuestionType.RATING) {
        const values = rawAnswers.filter(
          (a): a is number => typeof a === 'number',
        );
        const average =
          values.length > 0
            ? Math.round(
                (values.reduce((s, v) => s + v, 0) / values.length) * 10,
              ) / 10
            : 0;
        const distribution: Record<number, number> = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };
        for (const v of values)
          if (distribution[v] !== undefined) distribution[v] += 1;
        return { id: q.id, type: q.type, text: q.text, average, distribution };
      }

      const textAnswers = responses
        .map((r, idx) => ({
          answer: rawAnswers[idx],
          respondentName: r.user.fullName,
        }))
        .filter(
          (a): a is { answer: string; respondentName: string } =>
            typeof a.answer === 'string' && a.answer.length > 0,
        )
        .map((a) => ({
          answer: a.answer,
          respondentName: survey.isAnonymous ? undefined : a.respondentName,
        }));
      return { id: q.id, type: q.type, text: q.text, textAnswers };
    });

    return {
      survey: {
        id: survey.id,
        title: survey.title,
        isAnonymous: survey.isAnonymous,
        responseCount: responses.length,
      },
      questions,
    };
  }
}
