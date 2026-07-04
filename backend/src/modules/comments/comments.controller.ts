import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CommentsService } from './comments.service';

@ApiTags('comments')
@Controller('comments')
@UseGuards(RolesGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findForRisk(@Query('riskId') riskId: string) {
    return this.commentsService.findForRisk(riskId);
  }

  @Post()
  create(@Body() body: { riskId: string; text: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.commentsService.create(body.riskId, body.text, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { text: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.commentsService.update(id, body.text, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commentsService.remove(id);
  }
}
