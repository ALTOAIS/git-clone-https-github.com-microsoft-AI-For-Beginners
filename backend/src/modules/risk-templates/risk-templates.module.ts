import { Module } from '@nestjs/common';
import { RiskTemplatesController } from './risk-templates.controller';
import { RiskTemplatesService } from './risk-templates.service';

@Module({
  controllers: [RiskTemplatesController],
  providers: [RiskTemplatesService],
  exports: [RiskTemplatesService],
})
export class RiskTemplatesModule {}
