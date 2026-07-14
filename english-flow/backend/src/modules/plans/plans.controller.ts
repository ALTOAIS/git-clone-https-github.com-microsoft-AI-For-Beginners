import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlansService } from './plans.service';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get('today')
  getToday(@CurrentUser() user: JwtUser) {
    return this.plansService.getToday(user.userId);
  }

  @Post('today/busy')
  switchToBusy(@CurrentUser() user: JwtUser) {
    return this.plansService.switchToBusy(user.userId);
  }

  @Post('today/tasks/:taskId/complete')
  completeTask(@CurrentUser() user: JwtUser, @Param('taskId') taskId: string) {
    return this.plansService.completeTask(user.userId, taskId);
  }
}
