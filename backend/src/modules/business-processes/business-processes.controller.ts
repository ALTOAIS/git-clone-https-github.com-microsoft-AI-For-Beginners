import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BusinessProcessesService } from './business-processes.service';

@ApiTags('business-processes')
@Controller('business-processes')
@UseGuards(RolesGuard)
export class BusinessProcessesController {
  constructor(private readonly service: BusinessProcessesService) {}

  @Get()
  findAll(@Query('departmentId') departmentId?: string) {
    return this.service.findAll(departmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMINISTRATOR)
  create(@Body() body: { name: string; departmentId: string }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRATOR)
  update(@Param('id') id: string, @Body() body: { name?: string; departmentId?: string; isActive?: boolean }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
