import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { SourcesService } from './sources.service';

const MANAGE_ROLES = [Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER, Role.COMPLIANCE_OFFICER];

@ApiTags('sources')
@Controller('sources')
@UseGuards(RolesGuard)
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.sourcesService.findAll({ page: Number(page), pageSize: Number(pageSize), type, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sourcesService.findOne(id);
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(@Body() dto: CreateSourceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sourcesService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER)
  remove(@Param('id') id: string) {
    return this.sourcesService.remove(id);
  }

  @Post(':id/link/:riskId')
  @Roles(...MANAGE_ROLES)
  link(@Param('id') id: string, @Param('riskId') riskId: string) {
    return this.sourcesService.linkToRisk(id, riskId);
  }

  @Delete(':id/link/:riskId')
  @Roles(...MANAGE_ROLES)
  unlink(@Param('id') id: string, @Param('riskId') riskId: string) {
    return this.sourcesService.unlinkFromRisk(id, riskId);
  }
}
