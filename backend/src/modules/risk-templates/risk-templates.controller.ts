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
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRiskTemplateDto } from './dto/create-risk-template.dto';
import { QueryRiskTemplatesDto } from './dto/query-risk-templates.dto';
import { UpdateRiskTemplateDto } from './dto/update-risk-template.dto';
import { RiskTemplatesService } from './risk-templates.service';

const EDIT_ROLES = [Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER, Role.COMPLIANCE_OFFICER];
/** Any authenticated user with a risk/analysis authoring role may use a template to create a risk. */
const USE_ROLES = [...EDIT_ROLES, Role.RISK_OWNER, Role.DEPARTMENT_MANAGER];

@ApiTags('risk-templates')
@Controller('risk-templates')
@UseGuards(RolesGuard)
export class RiskTemplatesController {
  constructor(private readonly service: RiskTemplatesService) {}

  @Get()
  findAll(@Query() query: QueryRiskTemplatesDto) {
    return this.service.findAll(query);
  }

  @Get('tags')
  listTags() {
    return this.service.listTags();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/similar')
  findSimilar(@Param('id') id: string) {
    return this.service.findSimilar(id);
  }

  @Post()
  @Roles(...EDIT_ROLES)
  create(@Body() dto: CreateRiskTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...EDIT_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRiskTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Post(':id/duplicate')
  @Roles(...EDIT_ROLES)
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.duplicate(id, user.id);
  }

  @Post(':id/create-risk')
  @Roles(...USE_ROLES)
  createRisk(
    @Param('id') id: string,
    @Body()
    dto: {
      title?: string;
      description?: string;
      categoryId?: string;
      companyId?: string;
      departmentId?: string;
      businessProcessId?: string;
      ownerId?: string;
      likelihood?: number;
      impact?: number;
      controls?: string[];
      actions?: string[];
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createRisk(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(...EDIT_ROLES)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.id);
  }
}
