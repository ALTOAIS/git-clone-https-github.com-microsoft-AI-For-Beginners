import { Module } from '@nestjs/common';
import { ActionsModule } from '../actions/actions.module';
import { RisksModule } from '../risks/risks.module';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';

@Module({
  imports: [RisksModule, ActionsModule],
  controllers: [AnalysesController],
  providers: [AnalysesService],
  exports: [AnalysesService],
})
export class AnalysesModule {}
