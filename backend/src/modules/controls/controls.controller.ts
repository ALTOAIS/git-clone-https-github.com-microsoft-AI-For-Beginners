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
import { Role } from '@prisma/client';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ControlsService } from './controls.service';
import { CreateControlDto } from './dto/create-control.dto';
import { UpdateControlDto } from './dto/update-control.dto';

const MANAGE_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
  Role.RISK_OWNER,
];

@ApiTags('controls')
@Controller('controls')
@UseGuards(RolesGuard)
export class ControlsController {
  constructor(private readonly controlsService: ControlsService) {}

  @Get()
  findAllForRisk(@Query('riskId') riskId?: string) {
    return this.controlsService.findAllForRisk(riskId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.controlsService.findOne(id);
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(
    @Body() dto: CreateControlDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.controlsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateControlDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.controlsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.controlsService.remove(id, user.id);
  }
}
