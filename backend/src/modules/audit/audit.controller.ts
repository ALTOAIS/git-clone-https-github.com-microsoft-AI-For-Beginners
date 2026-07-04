import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER, Role.INTERNAL_AUDIT)
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      entityType,
      userId,
    });
  }
}
