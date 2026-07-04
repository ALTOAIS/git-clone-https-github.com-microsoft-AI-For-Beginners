import { Module } from '@nestjs/common';
import { BusinessProcessesController } from './business-processes.controller';
import { BusinessProcessesService } from './business-processes.service';

@Module({
  controllers: [BusinessProcessesController],
  providers: [BusinessProcessesService],
  exports: [BusinessProcessesService],
})
export class BusinessProcessesModule {}
