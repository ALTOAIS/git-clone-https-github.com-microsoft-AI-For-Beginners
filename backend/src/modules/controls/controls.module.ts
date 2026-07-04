import { Module } from '@nestjs/common';
import { RisksModule } from '../risks/risks.module';
import { ControlsController } from './controls.controller';
import { ControlsService } from './controls.service';

@Module({
  imports: [RisksModule],
  controllers: [ControlsController],
  providers: [ControlsService],
  exports: [ControlsService],
})
export class ControlsModule {}
