import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

/** Публичный health-endpoint для мониторинга и Render health checks. */
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      service: 'english-flow-api',
      time: new Date().toISOString(),
    };
  }
}
