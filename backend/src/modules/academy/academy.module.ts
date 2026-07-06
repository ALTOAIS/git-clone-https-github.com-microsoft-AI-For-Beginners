import { Module } from '@nestjs/common';
import { CertificatesModule } from '../certificates/certificates.module';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';

@Module({
  imports: [CertificatesModule],
  controllers: [AcademyController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule {}
