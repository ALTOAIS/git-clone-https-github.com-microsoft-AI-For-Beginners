import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GrammarService } from './grammar.service';

@Controller('grammar')
@UseGuards(JwtAuthGuard)
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @Get('rules')
  listRules() {
    return this.grammarService.listRules();
  }

  @Get('rules/:ruleCode')
  getRule(@Param('ruleCode') ruleCode: string) {
    return this.grammarService.getRuleDetail(ruleCode);
  }
}
