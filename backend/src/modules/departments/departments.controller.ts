import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@Controller('departments')
@UseGuards(RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.departmentsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMINISTRATOR)
  create(@Body() body: { name: string; companyId: string }) {
    return this.departmentsService.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRATOR)
  update(@Param('id') id: string, @Body() body: { name?: string; companyId?: string; isActive?: boolean }) {
    return this.departmentsService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR)
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
