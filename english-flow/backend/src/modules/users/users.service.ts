import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './users.dto';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  nativeLanguage: true,
  targetLanguage: true,
  timezone: true,
  currentLevel: true,
  dailyGoalMinutes: true,
  goals: true,
  preferredTopics: true,
  preferredLearningMethods: true,
  selfAssessment: true,
  reminderTime: true,
  notificationSettings: true,
  onboardingCompleted: true,
  streakDays: true,
  lastStudyDate: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...USER_SELECT, skillProfile: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { interfaceLanguage: _interfaceLanguage, ...data } = dto;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        selfAssessment: dto.selfAssessment ?? undefined,
        notificationSettings: dto.notificationSettings ?? undefined,
      },
    });
    return this.getMe(userId);
  }

  /**
   * Обновляет учебный стрик: вызывается при любой завершённой активности.
   * Дата считается в часовом поясе пользователя.
   */
  async registerStudyActivity(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, streakDays: true, lastStudyDate: true },
    });
    if (!user) return;
    const today = this.localDate(new Date(), user.timezone);
    const last = user.lastStudyDate
      ? this.localDate(user.lastStudyDate, user.timezone)
      : null;
    if (last === today) return;
    const yesterday = this.localDate(
      new Date(Date.now() - 24 * 3600 * 1000),
      user.timezone,
    );
    const streakDays = last === yesterday ? user.streakDays + 1 : 1;
    await this.prisma.user.update({
      where: { id: userId },
      data: { streakDays, lastStudyDate: new Date() },
    });
  }

  localDate(date: Date, timezone: string): string {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
      }).format(date);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }
}
