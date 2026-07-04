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
import { AssessRiskDto } from './dto/assess-risk.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateRiskDto } from './dto/create-risk.dto';
import { QueryRisksDto } from './dto/query-risks.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RisksService } from './risks.service';

const EDIT_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
  Role.RISK_OWNER,
];
const APPROVE_ROLES = [Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER];

@ApiTags('risks')
@Controller('risks')
@UseGuards(RolesGuard)
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Get()
  findAll(@Query() query: QueryRisksDto) {
    return this.risksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.risksService.findOne(id);
  }

  @Post()
  @Roles(...EDIT_ROLES)
  create(@Body() dto: CreateRiskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.risksService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...EDIT_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRiskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.risksService.update(id, dto, user.id);
  }

  @Patch(':id/assess')
  @Roles(...EDIT_ROLES)
  assess(
    @Param('id') id: string,
    @Body() dto: AssessRiskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.risksService.assess(id, dto, user.id);
  }

  @Patch(':id/status')
  @Roles(...APPROVE_ROLES, Role.RISK_OWNER, Role.COMPLIANCE_OFFICER)
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.risksService.changeStatus(id, dto, user.id);
  }

  @Patch(':id/archive')
  @Roles(...APPROVE_ROLES)
  archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.risksService.archive(id, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR)
  remove(@Param('id') id: string) {
    return this.risksService.remove(id);
  }
}
