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
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { CreateTrainingPlanDto } from './dto/create-training-plan.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';
import { UpdateTrainingPlanDto } from './dto/update-training-plan.dto';
import { TrainingPlansService } from './training-plans.service';

const MANAGE_ROLES = [
  Role.ADMINISTRATOR,
  Role.COMPLIANCE_MANAGER,
  Role.COMPLIANCE_OFFICER,
];

@ApiTags('training-plans')
@Controller('training-plans')
@UseGuards(RolesGuard)
export class TrainingPlansController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @Get()
  findAll(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.trainingPlansService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trainingPlansService.findOne(id);
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(
    @Body() dto: CreateTrainingPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trainingPlansService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTrainingPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trainingPlansService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(...MANAGE_ROLES)
  remove(@Param('id') id: string) {
    return this.trainingPlansService.remove(id);
  }

  @Post(':id/items')
  @Roles(...MANAGE_ROLES)
  addItem(@Param('id') id: string, @Body() dto: CreatePlanItemDto) {
    return this.trainingPlansService.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  @Roles(...MANAGE_ROLES)
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePlanItemDto,
  ) {
    return this.trainingPlansService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(...MANAGE_ROLES)
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.trainingPlansService.removeItem(id, itemId);
  }
}
