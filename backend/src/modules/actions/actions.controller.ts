import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ActionStatus, Role } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ActionsService } from './actions.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';

const MANAGE_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
  Role.RISK_OWNER,
  Role.DEPARTMENT_MANAGER,
];

@ApiTags('actions')
@Controller('actions')
@UseGuards(RolesGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('riskId') riskId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('status') status?: ActionStatus,
    @Query('overdueOnly') overdueOnly?: string,
  ) {
    return this.actionsService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      riskId,
      ownerId,
      status,
      overdueOnly: overdueOnly === 'true',
    });
  }

  @Get('overdue')
  findOverdue() {
    return this.actionsService.findOverdue();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actionsService.findOne(id);
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(@Body() dto: CreateActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.actionsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.actionsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.actionsService.remove(id, user.id);
  }
}
