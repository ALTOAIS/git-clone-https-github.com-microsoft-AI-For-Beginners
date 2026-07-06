import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CertificatesService } from './certificates.service';

const MANAGE_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
];

@ApiTags('certificates')
@Controller('certificates')
@UseGuards(RolesGuard)
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('my')
  findMy(@CurrentUser() user: AuthenticatedUser) {
    return this.certificatesService.findMy(user.id);
  }

  @Get()
  @Roles(...MANAGE_ROLES)
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.certificatesService.findAll({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      courseId,
    });
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const isManager = MANAGE_ROLES.some((role) => role === user.role);
    if (!isManager) {
      const certificate = await this.certificatesService.findOne(id);
      if (certificate.userId !== user.id) {
        throw new ForbiddenException(
          'Можно скачивать только собственные сертификаты',
        );
      }
    }
    const buffer = await this.certificatesService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${id}.pdf"`,
    });
    return res.send(buffer);
  }
}
