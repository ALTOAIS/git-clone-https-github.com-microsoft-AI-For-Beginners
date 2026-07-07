import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';

@Module({
  imports: [CertificatesModule, AttachmentsModule],
  controllers: [AcademyController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule {}
