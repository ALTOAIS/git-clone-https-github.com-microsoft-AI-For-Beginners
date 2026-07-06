import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignStatus, CourseAssignmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { LinkCourseDto } from './dto/link-course.dto';
import { LinkSurveyDto } from './dto/link-survey.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

const DETAIL_INCLUDE = {
  createdBy: { select: { id: true, fullName: true, email: true } },
  courses: {
    include: { course: { select: { id: true, title: true, status: true } } },
  },
  surveys: {
    include: { survey: { select: { id: true, title: true, status: true } } },
  },
} satisfies Prisma.CampaignInclude;

const LIST_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  _count: { select: { courses: true, surveys: true } },
} satisfies Prisma.CampaignInclude;

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: {
    page: number;
    pageSize: number;
    status?: CampaignStatus;
    search?: string;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CampaignWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!campaign) throw new NotFoundException('Кампания не найдена');
    return campaign;
  }

  async create(dto: CreateCampaignDto, userId?: string) {
    const campaign = await this.prisma.campaign.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        createdById: userId,
      },
      include: DETAIL_INCLUDE,
    });
    await this.audit.record({
      entityType: 'CAMPAIGN',
      entityId: campaign.id,
      action: 'CREATE',
      userId,
    });
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto, userId?: string) {
    await this.findOne(id);
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startDate !== undefined
          ? { startDate: new Date(dto.startDate) }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: new Date(dto.endDate) }
          : {}),
      },
      include: DETAIL_INCLUDE,
    });
    await this.audit.record({
      entityType: 'CAMPAIGN',
      entityId: id,
      action: 'UPDATE',
      userId,
    });
    return campaign;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.campaign.delete({ where: { id } });
  }

  async linkCourse(campaignId: string, dto: LinkCourseDto) {
    await this.findOne(campaignId);
    const existing = await this.prisma.campaignCourse.findUnique({
      where: { campaignId_courseId: { campaignId, courseId: dto.courseId } },
    });
    if (existing) throw new BadRequestException('Курс уже добавлен в кампанию');
    return this.prisma.campaignCourse.create({
      data: { campaignId, courseId: dto.courseId },
    });
  }

  async unlinkCourse(campaignId: string, courseId: string) {
    await this.findOne(campaignId);
    return this.prisma.campaignCourse.delete({
      where: { campaignId_courseId: { campaignId, courseId } },
    });
  }

  async linkSurvey(campaignId: string, dto: LinkSurveyDto) {
    await this.findOne(campaignId);
    const existing = await this.prisma.campaignSurvey.findUnique({
      where: { campaignId_surveyId: { campaignId, surveyId: dto.surveyId } },
    });
    if (existing)
      throw new BadRequestException('Опрос уже добавлен в кампанию');
    return this.prisma.campaignSurvey.create({
      data: { campaignId, surveyId: dto.surveyId },
    });
  }

  async unlinkSurvey(campaignId: string, surveyId: string) {
    await this.findOne(campaignId);
    return this.prisma.campaignSurvey.delete({
      where: { campaignId_surveyId: { campaignId, surveyId } },
    });
  }

  async getProgress(campaignId: string) {
    const campaign = await this.findOne(campaignId);
    const courseIds = campaign.courses.map((c) => c.courseId);
    const surveyIds = campaign.surveys.map((s) => s.surveyId);
    const totalItems = courseIds.length + surveyIds.length;

    const targetUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(campaign.targetRoles.length > 0
          ? { role: { in: campaign.targetRoles } }
          : {}),
      },
      select: { id: true, fullName: true, email: true, role: true },
    });
    const targetUserIds = targetUsers.map((u) => u.id);

    const [assignments, responses] = await Promise.all([
      courseIds.length > 0
        ? this.prisma.courseAssignment.findMany({
            where: {
              courseId: { in: courseIds },
              userId: { in: targetUserIds },
              status: CourseAssignmentStatus.COMPLETED,
            },
            select: { userId: true, courseId: true },
          })
        : Promise.resolve([]),
      surveyIds.length > 0
        ? this.prisma.surveyResponse.findMany({
            where: {
              surveyId: { in: surveyIds },
              userId: { in: targetUserIds },
            },
            select: { userId: true, surveyId: true },
          })
        : Promise.resolve([]),
    ]);

    const completedByUser = new Map<string, Set<string>>();
    for (const a of assignments) {
      const set = completedByUser.get(a.userId) ?? new Set<string>();
      set.add(`course:${a.courseId}`);
      completedByUser.set(a.userId, set);
    }
    for (const r of responses) {
      const set = completedByUser.get(r.userId) ?? new Set<string>();
      set.add(`survey:${r.surveyId}`);
      completedByUser.set(r.userId, set);
    }

    const participants = targetUsers.map((u) => {
      const completedItems = completedByUser.get(u.id)?.size ?? 0;
      return {
        user: { id: u.id, fullName: u.fullName, email: u.email, role: u.role },
        completedItems,
        totalItems,
        percent:
          totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      };
    });

    return { totalItems, participants };
  }
}
