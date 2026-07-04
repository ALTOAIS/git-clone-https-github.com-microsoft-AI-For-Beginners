import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@Controller('companies')
@UseGuards(RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMINISTRATOR)
  create(@Body() body: { name: string; description?: string }) {
    return this.companiesService.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRATOR)
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.companiesService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR)
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
