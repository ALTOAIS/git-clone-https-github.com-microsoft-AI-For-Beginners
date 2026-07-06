import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCertificatePdf } from './certificate-pdf.util';

const DETAIL_INCLUDE = {
  course: { select: { id: true, title: true } },
  user: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.CertificateInclude;

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Выдаёт сертификат при завершении назначения курса. Если для курса создан
   * итоговый тест, выдача возможна только при наличии успешной попытки —
   * без теста достаточно самого факта завершения. Идемпотентно: повторный
   * вызов для уже сертифицированной пары курс/работник не создаёт дубликат.
   */
  async issueIfEligible(courseId: string, userId: string) {
    const existing = await this.prisma.certificate.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });
    if (existing) return existing;

    const test = await this.prisma.test.findUnique({ where: { courseId } });
    let scorePercent: number | undefined;
    if (test) {
      const bestAttempt = await this.prisma.testAttempt.findFirst({
        where: { testId: test.id, userId, passed: true },
        orderBy: { scorePercent: 'desc' },
      });
      if (!bestAttempt) return null;
      scorePercent = bestAttempt.scorePercent;
    }

    const certificateNumber = `CRH-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    return this.prisma.certificate.create({
      data: { courseId, userId, scorePercent, certificateNumber },
    });
  }

  async findMy(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: DETAIL_INCLUDE,
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findAll(query: { page: number; pageSize: number; courseId?: string }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.courseId ? { courseId: query.courseId } : {};
    const [items, total] = await Promise.all([
      this.prisma.certificate.findMany({
        where,
        include: DETAIL_INCLUDE,
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.certificate.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!certificate) throw new NotFoundException('Сертификат не найден');
    return certificate;
  }

  async generatePdf(id: string) {
    const certificate = await this.findOne(id);
    return buildCertificatePdf({
      certificateNumber: certificate.certificateNumber,
      courseTitle: certificate.course.title,
      recipientName: certificate.user.fullName,
      scorePercent: certificate.scorePercent,
      issuedAt: certificate.issuedAt,
    });
  }
}
