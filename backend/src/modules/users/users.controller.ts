import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.id);
  }

  @Get()
  @Roles(Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER)
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll({ page: Number(page), pageSize: Number(pageSize), search, role });
  }

  @Get(':id')
  @Roles(Role.ADMINISTRATOR, Role.COMPLIANCE_MANAGER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMINISTRATOR)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRATOR)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/reset-password')
  @Roles(Role.ADMINISTRATOR)
  resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.usersService.resetPassword(id, body.newPassword);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
